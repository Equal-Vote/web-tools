import { useEffect, useState } from 'react'
import { Typography } from '@mui/material'
import { StatsRow, StatsTable } from './StatsTable'
import { PROXY_ORIGIN } from './util'

const NB_BASE = 'https://unifiedprimary.nationbuilder.com/api/v2'
const YEARS = ['2021', '2022', '2023', '2024', '2025']

type Props = {
    getValidAccessToken: () => Promise<string | null>
}

const fetchSignupCount = async (year: string, token: string): Promise<number | null> => {
    const url = `${NB_BASE}/signups?stats[total]=count&filter[created_at_gte]=${year}-01-01&filter[created_at_lte]=${year}-12-31T23:59:59`
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

export const NationBuilderTable = ({ getValidAccessToken }: Props) => {
    const [rows, setRows] = useState<StatsRow[] | null>(null)

    useEffect(() => {
        getValidAccessToken().then(async token => {
            if (!token) return
            const counts = await Promise.all(YEARS.map(year => fetchSignupCount(year, token)))
            const values: Record<string, number> = {}
            YEARS.forEach((year, i) => {
                const count = counts[i]
                if (count !== null) values[year] = count
            })
            setRows([{ label: 'Volunteer Signups', values }])
        })
    }, [])

    return (
        <>
            <Typography variant='h5' sx={{ mt: 2 }}>NationBuilder Stats</Typography>
            {rows && <StatsTable rows={rows} years={YEARS} />}
        </>
    )
}
