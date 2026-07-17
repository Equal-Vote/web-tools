import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

export type StatsRow = {
    label: string
    values: Record<string, number>
}

type Props = {
    rows: StatsRow[]
    years: string[]
}

export const StatsTable = ({ rows, years }: Props) => (
    <Table size='small'>
        <TableHead>
            <TableRow>
                <TableCell></TableCell>
                {years.map(year => <TableCell key={year}>{year}</TableCell>)}
            </TableRow>
        </TableHead>
        <TableBody>
            {rows.map((row, i) => (
                <TableRow key={i}>
                    <TableCell>{row.label}</TableCell>
                    {years.map(year => (
                        <TableCell key={year}>{row.values[year] ?? '-'}</TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    </Table>
)
