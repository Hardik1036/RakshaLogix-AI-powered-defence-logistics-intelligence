"""
Tactical Inventory Router
Zero autonomous changes: stock adjustments audited and verified.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.auth import User
from app.models.logistics import Unit, Inventory, Consumption
from app.schemas.inventory import (
    InventoryRead,
    InventoryUpdate,
    TacticalStockSummary,
)
from app.security.dependencies import (
    get_current_user,
    require_role,
    verify_rate_limit,
)
from app.security.audit import log_audit_event

router = APIRouter(dependencies=[Depends(verify_rate_limit)])


def _calculate_stock_status(quantity: float, min_stock: float, max_stock: float) -> str:
    if quantity <= min_stock * 0.5:
        return "CRITICAL"
    if quantity <= min_stock:
        return "LOW"
    if quantity >= max_stock:
        return "SURPLUS"
    return "NORMAL"


@router.get("", response_model=List[InventoryRead])
def get_inventory_roster(
    unit_id: Optional[str] = Query(None, description="Filter by military formation/post"),
    item_type: Optional[str] = Query(None, description="Filter by item type (Fuel, Rations, etc.)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves tactical inventory across depots and forward posts.
    Calculates operational days of supply based on recent consumption ledgers.
    """
    query = db.query(Inventory).join(Unit)

    if unit_id:
        query = query.filter(Inventory.unit_id == unit_id)
    if item_type:
        query = query.filter(Inventory.item_type == item_type)

    inventories = query.all()
    results = []

    for inv in inventories:
        # Compute days of supply based on recent average burn
        recent_consumptions = (
            db.query(Consumption.quantity_used)
            .filter(Consumption.unit_id == inv.unit_id, Consumption.item_type == inv.item_type)
            .limit(7)
            .all()
        )
        avg_burn = (
            sum(c[0] for c in recent_consumptions) / len(recent_consumptions)
            if recent_consumptions
            else 60.0
        )
        days_supply = round(inv.quantity / (avg_burn + 1e-5), 1)
        status_label = _calculate_stock_status(inv.quantity, inv.minimum_stock, inv.maximum_stock)

        results.append(
            InventoryRead(
                id=inv.id,
                unit_id=inv.unit_id,
                unit_name=inv.unit.name if inv.unit else inv.unit_id,
                item_type=inv.item_type,
                quantity=inv.quantity,
                minimum_stock=inv.minimum_stock,
                maximum_stock=inv.maximum_stock,
                updated_at=inv.updated_at,
                days_of_supply=days_supply,
                stock_status=status_label,
            )
        )

    return results


@router.get("/{unit_id}", response_model=TacticalStockSummary)
def get_unit_stock_summary(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full sustainment posture for a specific tactical unit or forward post."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unit '{unit_id}' not found")

    inventories = db.query(Inventory).filter(Inventory.unit_id == unit_id).all()
    inv_reads = []

    for inv in inventories:
        status_label = _calculate_stock_status(inv.quantity, inv.minimum_stock, inv.maximum_stock)
        inv_reads.append(
            InventoryRead(
                id=inv.id,
                unit_id=inv.unit_id,
                unit_name=unit.name,
                item_type=inv.item_type,
                quantity=inv.quantity,
                minimum_stock=inv.minimum_stock,
                maximum_stock=inv.maximum_stock,
                updated_at=inv.updated_at,
                days_of_supply=round(inv.quantity / 80.0, 1),
                stock_status=status_label,
            )
        )

    return TacticalStockSummary(
        unit_id=unit.id,
        unit_name=unit.name,
        unit_type=unit.type,
        altitude_m=unit.altitude_m,
        inventories=inv_reads,
    )


@router.patch("/{inventory_id}", response_model=InventoryRead)
def update_stock_level(
    inventory_id: str,
    payload: InventoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_role(["CORPS_COMMANDER", "COMMANDER", "LOGISTICS_OFFICER"])),
):
    """
    Logistics Officer / Commander stock reconciliation endpoint.
    Strictly checked for non-negative quantities and immutably audited.
    """
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")

    old_qty = inv.quantity
    inv.quantity = payload.quantity
    if payload.minimum_stock is not None:
        inv.minimum_stock = payload.minimum_stock
    if payload.maximum_stock is not None:
        inv.maximum_stock = payload.maximum_stock

    inv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inv)

    # Immutably audit state modification
    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        user_id=officer.username,
        action="INVENTORY_RECONCILE",
        resource_target=f"inventory/{inventory_id}",
        ip_address=client_ip,
        metadata={
            "unit_id": inv.unit_id,
            "item_type": inv.item_type,
            "old_quantity": old_qty,
            "new_quantity": inv.quantity,
        },
        request_payload=payload.model_dump(),
    )

    return InventoryRead(
        id=inv.id,
        unit_id=inv.unit_id,
        unit_name=inv.unit.name if inv.unit else inv.unit_id,
        item_type=inv.item_type,
        quantity=inv.quantity,
        minimum_stock=inv.minimum_stock,
        maximum_stock=inv.maximum_stock,
        updated_at=inv.updated_at,
        days_of_supply=round(inv.quantity / 80.0, 1),
        stock_status=_calculate_stock_status(inv.quantity, inv.minimum_stock, inv.maximum_stock),
    )
