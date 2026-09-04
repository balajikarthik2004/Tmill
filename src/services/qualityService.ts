import type { CustomerComplaint, QualityStage, Rejection } from '@/types'
import { complaints, qualityTests, rejections } from '@/mock'
import { simulateDelay } from './delay'

export async function getQualityTests(filters: { stage?: QualityStage; result?: string } = {}) {
  let result = qualityTests
  if (filters.stage) result = result.filter((t) => t.stage === filters.stage)
  if (filters.result) result = result.filter((t) => t.result === filters.result)
  return simulateDelay(result)
}

export async function getQualitySummary() {
  const total = qualityTests.length
  const pass = qualityTests.filter((t) => t.result === 'Pass').length
  const rework = qualityTests.filter((t) => t.result === 'Rework').length
  const fail = qualityTests.filter((t) => t.result === 'Fail').length
  return simulateDelay({
    total,
    pass,
    rework,
    fail,
    passRatePct: Math.round((pass / total) * 1000) / 10,
    byStage: (['Cotton', 'Yarn', 'Fabric'] as QualityStage[]).map((stage) => {
      const stageTests = qualityTests.filter((t) => t.stage === stage)
      const stagePass = stageTests.filter((t) => t.result === 'Pass').length
      return {
        stage,
        total: stageTests.length,
        passRatePct: stageTests.length ? Math.round((stagePass / stageTests.length) * 1000) / 10 : 0,
      }
    }),
    rejectionKg: rejections.reduce((sum, r) => sum + r.qtyKg, 0),
    openComplaints: complaints.filter((c) => c.status === 'Open' || c.status === 'Investigating').length,
  })
}

export async function getRejections() {
  return simulateDelay(rejections)
}

export async function getComplaints() {
  return simulateDelay(complaints)
}

export interface RejectionSlice {
  key: string
  qtyKg: number
  count: number
}

export interface RejectionBreakdown {
  totalKg: number
  totalCount: number
  byReason: RejectionSlice[]
  byFactory: RejectionSlice[]
  byStage: RejectionSlice[]
}

function groupRejections(rows: Rejection[], keyOf: (r: Rejection) => string): RejectionSlice[] {
  const map = new Map<string, RejectionSlice>()
  for (const row of rows) {
    const key = keyOf(row)
    const slice = map.get(key) ?? { key, qtyKg: 0, count: 0 }
    slice.qtyKg += row.qtyKg
    slice.count += 1
    map.set(key, slice)
  }
  return [...map.values()].sort((a, b) => b.qtyKg - a.qtyKg)
}

/** Rejected quantity grouped by reason, unit and process stage. */
export async function getRejectionBreakdown(filters: { stage?: QualityStage } = {}) {
  const rows = filters.stage ? rejections.filter((r) => r.stage === filters.stage) : rejections
  const breakdown: RejectionBreakdown = {
    totalKg: rows.reduce((sum, r) => sum + r.qtyKg, 0),
    totalCount: rows.length,
    byReason: groupRejections(rows, (r) => r.reason),
    byFactory: groupRejections(rows, (r) => r.factoryId),
    byStage: groupRejections(rows, (r) => r.stage),
  }
  return simulateDelay(breakdown)
}

export type ComplaintStatus = CustomerComplaint['status']

export interface ComplaintSummary {
  total: number
  byStatus: Record<ComplaintStatus, number>
  byCategory: { category: string; count: number }[]
}

export async function getComplaintSummary() {
  const statuses: ComplaintStatus[] = ['Open', 'Investigating', 'Resolved', 'Closed']
  const byStatus = statuses.reduce(
    (acc, status) => {
      acc[status] = complaints.filter((c) => c.status === status).length
      return acc
    },
    {} as Record<ComplaintStatus, number>,
  )

  const categoryMap = new Map<string, number>()
  for (const c of complaints) categoryMap.set(c.category, (categoryMap.get(c.category) ?? 0) + 1)

  const summary: ComplaintSummary = {
    total: complaints.length,
    byStatus,
    byCategory: [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  }
  return simulateDelay(summary)
}
