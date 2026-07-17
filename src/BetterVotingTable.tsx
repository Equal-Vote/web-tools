import { Typography } from '@mui/material'
import { StatsRow, StatsTable } from './StatsTable'

const VOTING_METHODS = ['star', 'star_pr', 'approval', 'ranked_robin', 'rcv', 'choose_one', 'stv', 'multi_method'] as const
type VotingMethod = typeof VOTING_METHODS[number]

type YearData = {
    elections: number
    votes: number
} & Record<`${VotingMethod}_votes` | `${VotingMethod}_elections`, number>

type GlobalElectionStats = {
    by_year: Record<string, YearData>
}

const FIXTURE: GlobalElectionStats = {
    by_year: {
        '2022': {
            elections: 52, votes: 3100,
            star_votes: 2100, star_elections: 35,
            star_pr_votes: 250, star_pr_elections: 4,
            approval_votes: 320, approval_elections: 6,
            ranked_robin_votes: 180, ranked_robin_elections: 3,
            rcv_votes: 110, rcv_elections: 2,
            choose_one_votes: 130, choose_one_elections: 2,
            stv_votes: 10, stv_elections: 0,
            multi_method_votes: 0, multi_method_elections: 0,
        },
        '2023': {
            elections: 118, votes: 8400,
            star_votes: 5600, star_elections: 78,
            star_pr_votes: 720, star_pr_elections: 12,
            approval_votes: 890, approval_elections: 14,
            ranked_robin_votes: 430, ranked_robin_elections: 7,
            rcv_votes: 260, rcv_elections: 5,
            choose_one_votes: 310, choose_one_elections: 2,
            stv_votes: 90, stv_elections: 0,
            multi_method_votes: 100, multi_method_elections: 0,
        },
        '2024': {
            elections: 204, votes: 17500,
            star_votes: 11200, star_elections: 132,
            star_pr_votes: 1800, star_pr_elections: 24,
            approval_votes: 1950, approval_elections: 28,
            ranked_robin_votes: 980, ranked_robin_elections: 11,
            rcv_votes: 620, rcv_elections: 5,
            choose_one_votes: 700, choose_one_elections: 4,
            stv_votes: 180, stv_elections: 0,
            multi_method_votes: 70, multi_method_elections: 0,
        },
    },
}

const YEARS = Object.keys(FIXTURE.by_year).sort()

const ROWS: StatsRow[] = [
    {
        label: 'Elections Created',
        values: Object.fromEntries(YEARS.map(y => [y, FIXTURE.by_year[y].elections])),
    },
    {
        label: 'Votes Cast',
        values: Object.fromEntries(YEARS.map(y => [y, FIXTURE.by_year[y].votes])),
    },
    ...VOTING_METHODS.flatMap(method => [
        {
            label: `${method} Elections`,
            values: Object.fromEntries(YEARS.map(y => [y, FIXTURE.by_year[y][`${method}_elections`]])),
        },
        {
            label: `${method} Votes`,
            values: Object.fromEntries(YEARS.map(y => [y, FIXTURE.by_year[y][`${method}_votes`]])),
        },
    ]),
]

export const BetterVotingTable = () => (
    <>
        <Typography variant='h5' sx={{ mt: 2 }}>BetterVoting Stats</Typography>
        <StatsTable rows={ROWS} years={YEARS} />
    </>
)
