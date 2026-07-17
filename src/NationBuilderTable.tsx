import { useEffect, useState } from 'react'
import { Typography } from '@mui/material'
import { StatsRow, StatsTable } from './StatsTable'
import { NATIONBUILDER, PROXY_ORIGIN } from './util'

const YEARS = ['2021', '2022', '2023', '2024', '2025']

type Props = {
    getValidAccessToken: () => Promise<string | null>
}

const fetchSignupCount = async (year: string, token: string): Promise<number | null> => {
    const url = `${NATIONBUILDER}/signups?stats[total]=count&filter[created_at_gte]=${year}-01-01&filter[created_at_lte]=${year}-12-31T23:59:59`
    try {
        const res = await fetch(`${PROXY_ORIGIN}/${url}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return null
        const json = await res.json()
        return json?.meta?.stats?.total?.count ?? null
    } catch {
        return null
    }
}

type DonationStats = {
    donations: number
    donors: Set<string>
    fundsRaisedCents: number
}

const fetchDonationStatsForYear = async (year: string, token: string): Promise<DonationStats | null> => {
    const stats: DonationStats = { donations: 0, donors: new Set(), fundsRaisedCents: 0 }
    let page = 1
    const pageSize = 100

    while (true) {
        const url = `${NATIONBUILDER}/donations?filter[status]=succeeded&filter[succeeded_at_gte]=${year}-01-01&filter[succeeded_at_lte]=${year}-12-31T23:59:59&page[number]=${page}&page[size]=${pageSize}&fields[donations]=amount_in_cents,signup_id`
        try {
            const res = await fetch(`${PROXY_ORIGIN}/${url}`, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
            })
            if (!res.ok) return null
            const json = await res.json()
            const data: any[] = json?.data ?? []

            for (const donation of data) {
                const attrs = donation?.attributes ?? {}
                stats.donations++
                const signupId = attrs.signup_id ?? donation?.relationships?.signup?.data?.id
                if (signupId != null) stats.donors.add(String(signupId))
                const cents = attrs.amount_in_cents
                if (typeof cents === 'number') stats.fundsRaisedCents += cents
            }

            const nextPage = json?.meta?.pagination?.next_page
            if (!nextPage || data.length < pageSize) break
            page = nextPage
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

            const [signupCounts, donationResults] = await Promise.all([
                Promise.all(YEARS.map(year => fetchSignupCount(year, token))),
                Promise.all(YEARS.map(year => fetchDonationStatsForYear(year, token))),
            ])

            const signupValues: Record<string, number> = {}
            const donationValues: Record<string, number> = {}
            const donorValues: Record<string, number> = {}
            const fundsValues: Record<string, number> = {}

            YEARS.forEach((year, i) => {
                const count = signupCounts[i]
                if (count !== null) signupValues[year] = count

                const stats = donationResults[i]
                if (stats !== null) {
                    donationValues[year] = stats.donations
                    donorValues[year] = stats.donors.size
                    fundsValues[year] = Math.round(stats.fundsRaisedCents / 100)
                }
            })

            setRows([
                { label: 'Volunteer Signups', values: signupValues },
                { label: 'Number of Donations', values: donationValues },
                { label: 'Number of Donors', values: donorValues },
                { label: 'Funds Raised', values: fundsValues, format: (v) => '$' + v.toLocaleString() },
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
