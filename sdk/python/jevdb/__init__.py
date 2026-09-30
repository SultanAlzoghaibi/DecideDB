"""JevDB Python SDK.

Call Jev through JevDB's client and every request + response is copied to JevDB in the
background, with the user, group and tags you attach. Your Jev key only goes to Jev; your
JevDB key only goes to JevDB.

    from jevdb import JevDB, AsyncJevDB
"""

from .client import AsyncJevDB, JevDB

__all__ = ["JevDB", "AsyncJevDB"]
__version__ = "0.2.0"
