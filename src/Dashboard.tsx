import { Box, Typography } from '@mui/material'
import { useNationBuilderAuth } from './useNationBuilderAuth'
import { NationBuilderStatus } from './NationBuilderStatus'
import { BetterVotingTable } from './BetterVotingTable'

export default () => {
    const auth = useNationBuilderAuth()

    return <Box sx={{ p: 4 }}>
        <Typography variant='h4' sx={{ mb: 2 }}>Dashboard</Typography>
        <NationBuilderStatus auth={auth}>
            <BetterVotingTable />
        </NationBuilderStatus>
    </Box>
}
