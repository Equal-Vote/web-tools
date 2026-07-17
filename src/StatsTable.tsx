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
                <TableCell key='total'>Total</TableCell>
                {years.map(year => <TableCell key={year}>{year}</TableCell>)}
            </TableRow>
        </TableHead>
        <TableBody>
            {rows.map(row => (
                <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{years.reduce((prev, year) => prev + row.values[year], 0)}</TableCell>
                    {years.map(year => {
                        const val = row.values[year]
                        let display: string | number = '-'
                        if (val !== undefined) display = row.format ? row.format(val) : val
                        return <TableCell key={year}>{display}</TableCell>
                    })}
                </TableRow>
            ))}
        </TableBody>
    </Table>
)
