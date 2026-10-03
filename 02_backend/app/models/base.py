"""
Base Declarative Model and Spatial Field Abstraction
Enables PostGIS 16 (SRID 4326) in production and zero-overhead JSON/WKT fallback in testing/SQLite.
"""

import json
from typing import Any, Optional, Dict, List
from sqlalchemy import TypeDecorator, Text, String
from sqlalchemy.orm import DeclarativeBase

try:
    from geoalchemy2 import Geometry
    from geoalchemy2.elements import WKTElement, WKBElement
    from geoalchemy2.shape import to_shape
    from shapely.geometry import Point as ShapelyPoint, LineString as ShapelyLineString, mapping
    HAS_GEOALCHEMY = True
except ImportError:
    HAS_GEOALCHEMY = False


class Base(DeclarativeBase):
    pass


class SpatialPoint(TypeDecorator):
    """
    Transparent spatial point type.
    Stores Point(lon, lat) in SRID 4326 under PostGIS;
    serializes to JSON string under SQLite or environments without GeoAlchemy2.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if HAS_GEOALCHEMY and dialect.name == "postgresql":
            return dialect.type_descriptor(Geometry(geometry_type="POINT", srid=4326))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect):
        if value is None:
            return None
        if HAS_GEOALCHEMY and dialect.name == "postgresql":
            if isinstance(value, str):
                if value.startswith("POINT") or value.startswith("SRID="):
                    return value
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict) and "coordinates" in parsed:
                        coords = parsed["coordinates"]
                        return f"SRID=4326;POINT({coords[0]} {coords[1]})"
                except Exception:
                    return value
            elif isinstance(value, (list, tuple)) and len(value) >= 2:
                return f"SRID=4326;POINT({value[0]} {value[1]})"
            elif isinstance(value, dict) and "longitude" in value and "latitude" in value:
                return f"SRID=4326;POINT({value['longitude']} {value['latitude']})"
            return value

        # Non-PostGIS / SQLite mode:
        if isinstance(value, str):
            return value
        if isinstance(value, (list, tuple)) and len(value) >= 2:
            return json.dumps({"type": "Point", "coordinates": [float(value[0]), float(value[1])]})
        if isinstance(value, dict):
            if "coordinates" in value:
                return json.dumps(value)
            if "longitude" in value and "latitude" in value:
                return json.dumps({"type": "Point", "coordinates": [float(value["longitude"]), float(value["latitude"])]})
        return str(value)

    def process_result_value(self, value: Any, dialect) -> Optional[Dict[str, Any]]:
        if value is None:
            return None
        if HAS_GEOALCHEMY and dialect.name == "postgresql":
            try:
                if isinstance(value, (WKTElement, WKBElement)):
                    shape = to_shape(value)
                    return mapping(shape)
                if isinstance(value, str) and value.startswith("POINT"):
                    coords = value.replace("POINT(", "").replace(")", "").split()
                    return {"type": "Point", "coordinates": [float(coords[0]), float(coords[1])]}
            except Exception:
                pass
            return {"type": "Point", "raw": str(value)}

        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return {"type": "Point", "raw": value}
        return value


class SpatialLineString(TypeDecorator):
    """
    Transparent spatial linestring type.
    Stores LineString in SRID 4326 under PostGIS;
    serializes to GeoJSON LineString string under SQLite.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if HAS_GEOALCHEMY and dialect.name == "postgresql":
            return dialect.type_descriptor(Geometry(geometry_type="LINESTRING", srid=4326))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect):
        if value is None:
            return None
        if HAS_GEOALCHEMY and dialect.name == "postgresql":
            if isinstance(value, str):
                if value.startswith("LINESTRING") or value.startswith("SRID="):
                    return value
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict) and "coordinates" in parsed:
                        pts = ", ".join(f"{c[0]} {c[1]}" for c in parsed["coordinates"])
                        return f"SRID=4326;LINESTRING({pts})"
                except Exception:
                    return value
            elif isinstance(value, (list, tuple)):
                pts = ", ".join(f"{c[0]} {c[1]}" for c in value)
                return f"SRID=4326;LINESTRING({pts})"
            return value

        # Non-PostGIS / SQLite mode:
        if isinstance(value, str):
            return value
        if isinstance(value, (list, tuple)):
            return json.dumps({"type": "LineString", "coordinates": value})
        if isinstance(value, dict):
            return json.dumps(value)
        return str(value)

    def process_result_value(self, value: Any, dialect) -> Optional[Dict[str, Any]]:
        if value is None:
            return None
        if HAS_GEOALCHEMY and dialect.name == "postgresql":
            try:
                if isinstance(value, (WKTElement, WKBElement)):
                    shape = to_shape(value)
                    return mapping(shape)
                if isinstance(value, str) and value.startswith("LINESTRING"):
                    raw_pts = value.replace("LINESTRING(", "").replace(")", "").split(",")
                    coords = [[float(c.strip().split()[0]), float(c.strip().split()[1])] for c in raw_pts]
                    return {"type": "LineString", "coordinates": coords}
            except Exception:
                pass
            return {"type": "LineString", "raw": str(value)}

        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return {"type": "LineString", "raw": value}
        return value
