import { Building2, FlaskConical, Globe, Mail, MapPin, Phone, Settings2, Sprout } from 'lucide-react'

import { company, factories } from '@/mock'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Administration() {
  const { headquarters, contact } = company

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Administration</h1>
        <p className="text-sm text-muted-foreground">Company profile, plant registry and system configuration.</p>
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
                {company.taglines[0]} · Established {company.establishedYear}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{company.about}</p>

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
            <Sprout className="h-4 w-4 text-success-600" />
            <CardTitle>Quality &amp; Environment Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{company.qualityPolicy}</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plant Registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {factories.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.type} · {f.location}
                  </div>
                </div>
                <Badge variant="secondary">{f.installedCapacity}</Badge>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Unit names and capacities are illustrative demo values for this prototype.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <FlaskConical className="h-4 w-4 text-teal-600" />
            <CardTitle>Machinery &amp; Lab</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Machinery partners</div>
              <div className="flex flex-wrap gap-1.5">
                {company.machineryPartners.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Lab equipment</div>
              <div className="flex flex-wrap gap-1.5">
                {company.labEquipment.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Cotton blends</div>
              <div className="flex flex-wrap gap-1.5">
                {company.cottonBlends.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Quality Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {company.qualityHighlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
