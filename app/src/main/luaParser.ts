import luaparse from 'luaparse'
import type { Chunk, Expression, TableConstructorExpression } from 'luaparse'

export class LuaParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LuaParseError'
  }
}

const utf8 = new TextDecoder('utf-8')

/** WoW writes SavedVariables as UTF-8 bytes; luaparse 'x-user-defined' wants bytes 0x80–0xFF as U+F780–U+F7FF. */
function toByteString(source: string): string {
  const bytes = new TextEncoder().encode(source)
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = Array.from(bytes.subarray(i, i + 0x8000), (b) => (b >= 0x80 ? 0xf700 + b : b))
    out += String.fromCharCode(...chunk)
  }
  return out
}

/** luaparse 'x-user-defined' maps bytes 0x80–0xFF to U+F780–U+F7FF; turn that back into UTF-8 text. */
function decodeLuaString(value: string): string {
  const bytes = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    bytes[i] = code >= 0xf780 ? code - 0xf700 : code
  }
  return utf8.decode(bytes)
}

function toJs(node: Expression): unknown {
  switch (node.type) {
    case 'StringLiteral':
      return decodeLuaString(node.value ?? '')
    case 'NumericLiteral':
      return node.value
    case 'BooleanLiteral':
      return node.value
    case 'NilLiteral':
      return null
    case 'UnaryExpression':
      if (node.operator === '-') {
        const v = toJs(node.argument)
        if (typeof v === 'number') return -v
      }
      break
    case 'TableConstructorExpression':
      return tableToJs(node)
  }
  throw new LuaParseError(`Unsupported Lua expression: ${node.type}`)
}

function tableToJs(table: TableConstructorExpression): unknown {
  const fields = table.fields
  if (fields.length > 0 && fields.every((f) => f.type === 'TableValue')) {
    return fields.map((f) => toJs(f.value))
  }
  const out: Record<string, unknown> = {}
  let index = 1
  for (const f of fields) {
    if (f.type === 'TableKeyString') {
      out[f.key.name] = toJs(f.value)
    } else if (f.type === 'TableKey') {
      const key = toJs(f.key)
      if (typeof key !== 'string' && typeof key !== 'number') {
        throw new LuaParseError('Unsupported table key')
      }
      out[String(key)] = toJs(f.value)
    } else {
      out[String(index++)] = toJs(f.value)
    }
  }
  return out
}

/** Parses a WoW SavedVariables file and returns the value assigned to `varName` as plain JS. */
export function parseSavedVariables(source: string, varName = 'AzerothTrackerDB'): unknown {
  let chunk: Chunk
  try {
    chunk = luaparse.parse(toByteString(source), { luaVersion: '5.1', encodingMode: 'x-user-defined', comments: false })
  } catch (e) {
    throw new LuaParseError(e instanceof Error ? e.message : String(e))
  }
  for (const stmt of chunk.body) {
    if (stmt.type !== 'AssignmentStatement') continue
    const i = stmt.variables.findIndex((v) => v.type === 'Identifier' && v.name === varName)
    if (i >= 0 && stmt.init[i]) return toJs(stmt.init[i])
  }
  throw new LuaParseError(`Variable ${varName} not found`)
}
