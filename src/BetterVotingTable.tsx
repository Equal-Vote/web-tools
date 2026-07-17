import { useEffect, useState } from 'react'
import { CircularProgress, Typography } from '@mui/material'
import { StatsRow, StatsTable } from './StatsTable'
import { GLOBAL_ELECTION_STATS_API, PROXY_ORIGIN } from './util'

const VOTING_METHODS = ['star', 'star_pr', 'approval', 'ranked_robin', 'rcv', 'choose_one', 'stv', 'multi_method'] as const
type VotingMethod = typeof VOTING_METHODS[number]

type YearData = {
    elections: number
    votes: number
} & Record<`${VotingMethod}_votes` | `${VotingMethod}_elections`, number>

type GlobalElectionStats = {
    by_year: Record<string, YearData>
}

function buildRows(stats: GlobalElectionStats): { years: string[]; rows: StatsRow[] } {
    const years = Object.keys(stats.by_year).sort()
    const rows: StatsRow[] = [
        {
            label: 'Elections Created',
            values: Object.fromEntries(years.map(y => [y, stats.by_year[y].elections])),
        },
        {
            label: 'Votes Cast',
            values: Object.fromEntries(years.map(y => [y, stats.by_year[y].votes])),
        },
        ...VOTING_METHODS.flatMap(method => [
            {
                label: `${method} Elections`,
                values: Object.fromEntries(years.map(y => [y, stats.by_year[y][`${method}_elections`]])),
            },
            {
                label: `${method} Votes`,
                values: Object.fromEntries(years.map(y => [y, stats.by_year[y][`${method}_votes`]])),
            },
        ]),
    ]
    return { years, rows }
}

export const BetterVotingTable = () => {
    const [stats, setStats] = useState<GlobalElectionStats | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch(`${PROXY_ORIGIN}/${GLOBAL_ELECTION_STATS_API}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json() as Promise<GlobalElectionStats>
            })
            .then(setStats)
            .catch((err: Error) => setError(err.message))
    }, [])

    const content = () => {
        if (error) return <Typography color='error'>Failed to load BetterVoting stats: {error}</Typography>
        if (!stats) return <CircularProgress size={24} />
        const { years, rows } = buildRows(stats)
        return <StatsTable rows={rows} years={years} />
    }

    return <>
        <Typography variant='h5' sx={{ mt: 2 }}>BetterVoting Stats</Typography>
        {content()}
    </>
}
