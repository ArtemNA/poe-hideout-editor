import type { HideoutProject, ValidationIssue } from './types'

export function validateHideout(project: HideoutProject): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (project.metadata.version === undefined) issues.push({ severity: 'warning', message: 'Missing format version; export will use version 1.' })
  if (project.metadata.hideoutHash === undefined) issues.push({ severity: 'error', message: 'Missing hideout_hash / Hideout Hash.' })
  if (!project.metadata.hideoutName) issues.push({ severity: 'warning', message: 'Missing hideout name.' })
  if (project.decorations.length === 0) issues.push({ severity: 'warning', message: 'The hideout contains no modeled decorations.' })
  for (const decoration of project.decorations) {
    if (!decoration.name) issues.push({ severity: 'error', message: 'Decoration has no game name.', decorationId: decoration.editorId })
    if (decoration.gameHash === undefined || !Number.isInteger(decoration.gameHash) || decoration.gameHash < 0) {
      issues.push({ severity: 'error', message: `${decoration.name}: invalid or missing hash.`, decorationId: decoration.editorId })
    }
    for (const [field, value] of [['x', decoration.x], ['y', decoration.y], ['r', decoration.rotation]] as const) {
      if (!Number.isFinite(value)) issues.push({ severity: 'error', message: `${decoration.name}: ${field} is not finite.`, decorationId: decoration.editorId })
    }
    if (!Number.isInteger(decoration.rotation)) issues.push({ severity: 'warning', message: `${decoration.name}: native rotation is not an integer.`, decorationId: decoration.editorId })
    if (decoration.variation < 0 || decoration.variation > 127) issues.push({ severity: 'warning', message: `${decoration.name}: variation will be packed into 7 bits.`, decorationId: decoration.editorId })
  }
  return issues
}
