import { useEffect, useState } from 'react'
import { Typography } from '@mui/material'
import { StatsRow, StatsTable } from './StatsTable'
import { NATIONBUILDER, NATIONBUILDER_BASE, PROXY_ORIGIN } from './util'

const years_from = 2014
const years_to = 2026;
const YEARS = Array.from(
  { length: years_to - years_from + 1 },
  (_, i) => String(years_from + i)
);

type Props = {
    getValidAccessToken: () => Promise<string | null>
}

const fetchSignupCount = async (year: string, token: string): Promise<number | null> => {
    const url = `${NATIONBUILDER}/signups?stats[total]=count&filter[created_at][gte]=${year}-01-01&filter[created_at][lte]=${year}-12-31T23:59:59`
    try {
        const res = await fetch(`${PROXY_ORIGIN}/${url}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        })
        if (!res.ok){
            console.log('signups failed', res, await res.json())
            return null
        }
        const json = await res.json()
        return json?.meta?.stats?.total?.count ?? null
    } catch {
        return null
    }
}

 type EventStats = {
     total: number
     inPerson: number
     virtual: number
     orientations: number
     chapterPrefixes: Set<string>
 }

const fetchEventStatsForYear = async (year: string, token: string): Promise<EventStats | null> => {
    const stats: EventStats = { total: 0, inPerson: 0, virtual: 0, orientations: 0, chapterPrefixes: new Set() }
    const pageSize = 100

    let url = `${NATIONBUILDER}/events?filter[start_at][gte]=${year}-01-01T00:00:00&filter[start_at][lte]=${year}-12-31T23:59:59&page[size]=${pageSize}&fields[events]=venue_name,page_id,start_at&include=page&fields[pages]=slug,name`
    console.log('events page', year);
    while (true) {
        try {
            const res = await fetch(`${PROXY_ORIGIN}/${url}`, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
            })
            if (!res.ok){
                console.log('events failed', res, await res.json())
                return null
            }
            const json = await res.json()
            const data: any[] = json?.data ?? []
            const included: any[] = json?.included ?? []

            const pageMap = new Map<string, any>()
            included.forEach(item => {
                if (item.type === 'pages') pageMap.set(item.id, item.attributes ?? {})
            })

            data.forEach(event => {
                const attrs = event?.attributes ?? {}
                stats.total++

                const venueName: string | null = attrs.venue_name ?? null
                if (venueName && !/virtual/i.test(venueName)) {
                    stats.inPerson++
                } else {
                    stats.virtual++
                }

                const pageId = attrs.page_id ?? event?.relationships?.page?.data?.id
                const pageAttrs = pageId != null ? pageMap.get(String(pageId)) ?? {} : {}
                const slug = pageAttrs.slug ?? ''
                const title = pageAttrs.name ?? ''
                const start_at = pageAttrs.start_at ?? ''

                console.log(year, slug, title, start_at)

                if (/orientation/i.test(slug) || /orientation/i.test(title)) {
                    stats.orientations++
                }

                const callMatch = slug.match(/^([^_]+)_call_/)
                if (callMatch) stats.chapterPrefixes.add(callMatch[1].toLowerCase())
            })

            if(data.length == 0) break;
            url = NATIONBUILDER_BASE+json.links?.next;
        } catch {
            return null
        }
    }

    console.log('chapters', year, stats.chapterPrefixes)
    return stats
}

type DonationStats = {
    donations: number
    donors: Set<string>
    fundsRaisedCents: number
}

const fetchDonationStatsForYear = async (year: string, token: string): Promise<DonationStats | null> => {
    const stats: DonationStats = { donations: 0, donors: new Set(), fundsRaisedCents: 0 }
    const pageSize = 100

    let url = `${NATIONBUILDER}/donations?filter[status]=succeeded&filter[succeeded_at][gte]=${year}-01-01&filter[succeeded_at][lte]=${year}-12-31T23:59:59&page[size]=${pageSize}&fields[donations]=amount_in_cents,signup_id`
    while (true) {
        try {
            const res = await fetch(`${PROXY_ORIGIN}/${url}`, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
            })
            if (!res.ok){
                console.log('donations failed', res, await res.json())
                return null
            }
            const json = await res.json()
            const data: any[] = json?.data ?? []

            data.forEach(donation => {
                const attrs = donation?.attributes ?? {}
                stats.donations++
                const signupId = attrs.signup_id ?? donation?.relationships?.signup?.data?.id
                if (signupId != null) stats.donors.add(String(signupId))
                const cents = attrs.amount_in_cents
                if (typeof cents === 'number') stats.fundsRaisedCents += cents
            })


            if(data.length == 0) break;
            url = NATIONBUILDER_BASE+json.links?.next;
        } catch {
            return null
        }
    }

    return stats
}

export const NationBuilderTable = ({ getValidAccessToken }: Props) => {
    const [rows, setRows] = useState<StatsRow[] | null>(null)

    useEffect(() => {
        const load = async () => {
            const token = await getValidAccessToken()
            if (!token) return

            const [signupCounts, donationResults, eventResults] = await Promise.all([
                Promise.all(YEARS.map(year => fetchSignupCount(year, token))),
                Promise.all(YEARS.map(year => fetchDonationStatsForYear(year, token))),
                Promise.all(YEARS.map(year => fetchEventStatsForYear(year, token))),
            ])

            const signupValues: Record<string, number> = {}
            const donationValues: Record<string, number> = {}
            const donorValues: Record<string, number> = {}
            const fundsValues: Record<string, number> = {}
            const eventsHeldValues: Record<string, number> = {}
            const inPersonValues: Record<string, number> = {}
            const virtualValues: Record<string, number> = {}
            const orientationValues: Record<string, number> = {}
            const chapterValues: Record<string, number> = {}

            YEARS.forEach((year, i) => {
                const count = signupCounts[i]
                if (count !== null) signupValues[year] = count

                const dStats = donationResults[i]
                if (dStats !== null) {
                    donationValues[year] = dStats.donations
                    donorValues[year] = dStats.donors.size
                    fundsValues[year] = Math.round(dStats.fundsRaisedCents / 100)
                }

                const eStats = eventResults[i]
                if (eStats !== null) {
                    eventsHeldValues[year] = eStats.total
                    inPersonValues[year] = eStats.inPerson
                    virtualValues[year] = eStats.virtual
                    orientationValues[year] = eStats.orientations
                    chapterValues[year] = eStats.chapterPrefixes.size
                }
            })

            setRows([
                { label: 'Volunteer Signups', values: signupValues },
                { label: 'Number of Donations', values: donationValues },
                { label: 'Number of Donors', values: donorValues },
                { label: 'Funds Raised', values: fundsValues, format: (v) => '$' + v.toLocaleString() },
                { label: 'Events Held', values: eventsHeldValues },
                { label: 'In Person Events', values: inPersonValues },
                { label: 'Virtual Events', values: virtualValues },
                { label: 'Orientations Ran', values: orientationValues },
                { label: 'Active Chapters & Branches', values: chapterValues },
            ])
        }
        load()
    }, [])

    return (
        <>
            <Typography variant='h5' sx={{ mt: 2 }}>NationBuilder Stats</Typography>
            {rows && <StatsTable rows={rows} years={YEARS} />}
        </>
    )
}
