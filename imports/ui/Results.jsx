import React from 'react';
import {Button, ButtonGroup, Grid} from '@mui/material';
import Paper from '@mui/material/Paper';
import * as C from '../models/components'


export const Results = ({options, results}) => {
    const statSpacing = 1;

    const simpleStat = function(label, value, units='') {
        return (
            <Grid container item xs={12} spacing={statSpacing}>
                <Grid item xs={2}>{label}</Grid>
                <Grid item xs={2}><Paper>{value}{units}</Paper></Grid>
            </Grid>)
    }
    return (
        <Grid container spacing={1}>
            <Grid container item xs={12} spacing={statSpacing}>
                <Grid item xs={2}>Chance you {!options.sea && options.city && !options.us.attacking ? 'do not lose' : 'win'}</Grid>
                <Grid item xs={2}><Paper>{Math.round(results.pVictory*100)}%</Paper></Grid>
            </Grid>

            {results.avgSurvivors && <Grid container item xs={12} spacing={statSpacing}>
                <Grid item xs={2}>Avg units rem.</Grid>
                <Grid item xs={4}><Paper>{results.avgSurvivors>0?'You have ':'They have '} {Math.round(Math.abs(results.avgSurvivors)*10)/10}</Paper></Grid>
            </Grid>}

            {results.killPs && <Grid container item xs={12} spacing={statSpacing}>
                <Grid item xs={2}>
                    Kills:
                </Grid>
                {results.killPs.map(stat =>
                    <Grid item key={stat.kills} xs={2}>
                        <Paper>{stat.kills}+ = {Math.round(stat.p*100)}%</Paper>
                    </Grid>)}
            </Grid>}
            {results.survivorPs && <Grid container item xs={12} spacing={statSpacing}>
                <Grid item xs={2}>
                    Survivors:
                </Grid>
                {results.survivorPs.map(stat =>
                    <Grid item key={stat.survivors} xs={2}>
                        <Paper>{stat.survivors}+ = {Math.round(stat.p*100)}%</Paper>
                    </Grid>)}
            </Grid>}

            {results.ourLeaderDiedP !== undefined && simpleStat('Your leader dies', Math.round(results.ourLeaderDiedP*100), '%')}
            {results.theirLeaderDiedP !== undefined && simpleStat('Their leader dies', Math.round(results.theirLeaderDiedP*100), '%')}
            {results.ourCardsPlayed !== undefined && simpleStat('Our cards played', Math.round(results.ourCardsPlayed*10)/10)}
            {results.theirCardsPlayed !== undefined && simpleStat('Their cards played', Math.round(results.theirCardsPlayed*10)/10)}
            {simpleStat('Avg rounds', Math.round(results.rounds*10)/10)}

        </Grid>
);
}
