import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

export type StatsRow = {
    label: string
    values: Record<string, number>
    format?: (value: number) => string
}

type Props = {
    rows: StatsRow[]
    years: string[]
}

export const StatsTable = ({ rows, years }: Props) => (
    <Table size='small'>
        <TableHead>
            <TableRow>
                <TableCell />
                {years.map(year => <TableCell key={year}>{year}</TableCell>)}
            </TableRow>
        </TableHead>
        <TableBody>
            {rows.map(row => (
                <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    {years.map(year => {
                        const val = row.values[year]
                        return <TableCell key={year}>{val !== undefined ? (row.format ? row.format(val) : val) : '-'}</TableCell>
                    })}
                </TableRow>
            ))}
        </TableBody>
    </Table>
)
