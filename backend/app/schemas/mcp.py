"""Pydantic schemas for MCP JSON-RPC protocol."""

from pydantic import BaseModel


class JsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = None
    method: str
    params: dict | None = None


class JsonRpcError(BaseModel):
    code: int
    message: str
    data: dict | None = None


class JsonRpcResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = None
    result: dict | list | None = None
    error: JsonRpcError | None = None
