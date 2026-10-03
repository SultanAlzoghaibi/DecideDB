"""DecisionDB Python SDK.

Call Jev through DecisionDB's client and every request + response is copied to DecisionDB in the
background, with the user, group and tags you attach. Your Jev key only goes to Jev; your
DecisionDB key only goes to DecisionDB.

    from decisiondb import DecisionDB, AsyncDecisionDB
"""

from .client import AsyncDecisionDB, DecisionDB

__all__ = ["DecisionDB", "AsyncDecisionDB"]
__version__ = "0.2.0"
