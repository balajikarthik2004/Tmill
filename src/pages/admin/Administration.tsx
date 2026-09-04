import { Award, Building2, Factory, GraduationCap, Globe, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'

import { company, factories } from '@/mock'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'

export default function Administration() {
  const { headquarters, contact, infrastructure, exports } = company

  const stats = [
    { label: 'Facilities', value: formatNumber(infrastructure.facilities) },
    { label: 'Spindles', value: formatNumber(infrastructure.spindles) },
    { label: 'Rotors', value: formatNumber(infrastructure.rotors) },
    { label: 'Employees', value: `~${formatNumber(infrastructure.employees)}` },
    { label: 'Established', value: String(company.establishedYear) },
  ]

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Administration"
        description="Company profile, plant registry and certifications."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-3.5">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-0.5 num text-lg font-semibold text-foreground">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle>Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-base font-semibold text-foreground">{company.legalName}</div>
              <div className="text-xs text-muted-foreground">
                {company.tagline} · Founded {company.establishedYear} by {company.founder}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{company.about}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{company.positioning}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">
                  {headquarters.address}, {headquarters.state}, {headquarters.country}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">{contact.phones.join(' · ')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">{contact.emails.join(' · ')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={contact.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {contact.website}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ShieldCheck className="h-4 w-4 text-success-600" />
            <CardTitle>Quality &amp; Environment Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">{company.qualityPolicy}</p>
            <div className="border-t border-border pt-3">
              <div className="mb-1 text-xs font-medium text-muted-foreground">Vision</div>
              <p className="text-sm text-foreground">{company.vision}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Plant Registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {factories.map((f) => (
              <div key={f.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{f.name}</span>
                  <Badge variant="secondary">{f.installedCapacity}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{f.countGroup}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Ranges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {company.productRanges.map((p) => (
              <div key={p.name}>
                <div className="text-sm font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.detail}</div>
              </div>
            ))}
            <div className="border-t border-border pt-2.5">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Cotton types</div>
              <div className="flex flex-wrap gap-1.5">
                {company.cottonTypes.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Award className="h-4 w-4 text-copper-600" />
            <CardTitle>Awards &amp; Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5">
              {company.awards.map((a) => (
                <li key={a.title} className="text-sm text-foreground">
                  {a.title}
                  {(a.body || a.year) && (
                    <span className="text-xs text-muted-foreground">
                      {' '}
                      — {[a.body, a.year].filter(Boolean).join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-3">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Certifications</div>
              <div className="flex flex-wrap gap-1.5">
                {company.certifications.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <GraduationCap className="h-4 w-4 text-info-600" />
            <CardTitle>Corporate Social Responsibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">{company.csr.principle}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {company.csr.institutions.map((inst) => (
                <div key={inst.name} className="rounded-md border border-border p-3">
                  <div className="text-sm font-medium text-foreground">{inst.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{inst.detail}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">CSR reports published for {company.csr.reports.join(', ')}.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Globe className="h-4 w-4 text-success-600" />
            <CardTitle>Export Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Countries served</span>
              <span className="font-semibold tabular-nums text-foreground">{exports.countries}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Share exported</span>
              <span className="font-semibold tabular-nums text-foreground">{exports.exportSharePct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Annual sales</span>
              <span className="font-semibold tabular-nums text-foreground">
                Over US${(exports.annualSalesUsd / 1_000_000).toFixed(0)}M
              </span>
            </div>
            <div className="border-t border-border pt-2.5">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Regions</div>
              <div className="flex flex-wrap gap-1.5">
                {exports.regions.map((r) => (
                  <Badge key={r} variant="outline">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
