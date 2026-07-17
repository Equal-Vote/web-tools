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

const FIXTURE: GlobalElectionStats =
{"by_year":{"2024":{"elections":209,"votes":5653,"star_votes":1857,"star_elections":142,"star_pr_votes":20,"star_pr_elections":4,"approval_votes":83,"approval_elections":15,"ranked_robin_votes":15,"ranked_robin_elections":3,"rcv_votes":12,"rcv_elections":3,"choose_one_votes":189,"choose_one_elections":3,"stv_votes":0,"stv_elections":0,"multi_method_votes":3477,"multi_method_elections":39},"2025":{"elections":1073,"votes":16186,"star_votes":9956,"star_elections":732,"star_pr_votes":857,"star_pr_elections":42,"approval_votes":664,"approval_elections":45,"ranked_robin_votes":477,"ranked_robin_elections":47,"rcv_votes":319,"rcv_elections":36,"choose_one_votes":567,"choose_one_elections":56,"stv_votes":415,"stv_elections":11,"multi_method_votes":2931,"multi_method_elections":104},"2026":{"elections":667,"votes":20827,"star_votes":15336,"star_elections":436,"star_pr_votes":228,"star_pr_elections":33,"approval_votes":215,"approval_elections":21,"ranked_robin_votes":888,"ranked_robin_elections":58,"rcv_votes":184,"rcv_elections":14,"choose_one_votes":133,"choose_one_elections":16,"stv_votes":29,"stv_elections":5,"multi_method_votes":3814,"multi_method_elections":84}}};

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
