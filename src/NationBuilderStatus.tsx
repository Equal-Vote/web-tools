import { Box, Button, Typography } from '@mui/material'
import { NationBuilderAuth } from './useNationBuilderAuth'

type Props = {
    auth: NationBuilderAuth
    children?: React.ReactNode
}

export const NationBuilderStatus = ({ auth, children }: Props) => (
    <>
        <Box display='flex' flexDirection='row' alignItems='center' gap={2}>
            {auth.isLoggedIn
                ? <>
                    <Typography><i>✓ Logged in</i></Typography>
                    <Button variant='outlined' size='small' onClick={auth.logout}>Log out</Button>
                </>
                : <>
                    <Typography><i>Logged out</i></Typography>
                    <Button variant='contained' size='small' onClick={auth.login}>Log in</Button>
                </>
            }
        </Box>
        {auth.isLoggedIn && children}
    </>
)
