"""DecideDB Python SDK.

Call Jev through DecideDB's client and every request + response is copied to DecideDB in the
background, with the user, group and tags you attach. Your Jev key only goes to Jev; your
DecideDB key only goes to DecideDB.

    from decidedb import DecideDB, AsyncDecideDB
"""

from .client import AsyncDecideDB, DecideDB

__all__ = ["DecideDB", "AsyncDecideDB"]
__version__ = "0.2.0"
