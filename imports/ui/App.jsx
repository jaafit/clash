import React, { useState } from 'react';
import {Player} from './Player';
import * as C from '../models/components'
import {simulateCombat, getPlayableCardTypes} from '../models/combat'
import { Grid, FormControlLabel, Switch, Button } from '@mui/material';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import Container from '@mui/material/Container';

export const App = () => {
    const initialState = {
        fort: false,
        temple: false,
        sea: false,
        city: true,
        amphibious: false,
        eclipse: false,
        trojan: false,
        us: {},
        them: {}
    };
    ['us', 'them'].forEach(function(who)  {
        initialState[who] = {
            civ: C.NOCIV,
            leader: C.NOLEADER,
            abilityValue: undefined,
            saveLeader: true,
            attacking: who === 'us',
            cards: [],
            wonders: Array(C.Wonders.length).fill(false),
            advances: Array(C.Advances.length).fill(false), // tribal warfare is scalar
            greatWarlord: false, // todo implement
            army: '',
            resources: {food: 7, wood: 7, ore: 7, gold: 7, culture: 7, mood: 7,
                need_food: false, need_wood: false, need_ore: false, need_culture: false
            }
        }
    });

    const [state, setState] =  useState(initialState)


    const mutuallyExclude = function(thisPlayer, thatPlayer) {
        thatPlayer.attacking = !thisPlayer.attacking;
        thisPlayer.wonders.forEach(function(have, i) {if (have) thatPlayer.wonders[i] = false;});
        if (thatPlayer.civ === thisPlayer.civ)
            thatPlayer.civ = C.NOCIV;
    }

    const handleOurOptionChange = function(player) {
        mutuallyExclude(player, state.them); // todo needs to use a function so that we use actual state
        state.sea = ~player.army.indexOf('s');
        setState({...state});
    };

    const handleTheirOptionChange = function(player) {
        mutuallyExclude(player, state.us);
        state.sea = ~player.army.indexOf('s');
        setState({...state});
    };

    const handleChangeOption = function(e) {
        let { value, name } = e.target;
        setState({...state, [name]: value});
    }

    const handleChangeCheckbox = function(e) {
        let {value, name} = e.target;
        if (state.city && name === 'city')
            state.fort = state.temple = false;
        if (!state.city && ['fort', 'temple'].some(x => name === x && !state[name] ))
            state.city = true;
        setState({...state, [name]: !state[name]})
    }
    const go = function() {
        const [pWin, avgStanding, players] = simulateCombat(state, 10000);
        setState({...state, pWin:pWin});
    }

    const playableCardTypesYou = getPlayableCardTypes(state, state.us);
    const playableCardTypesThem = getPlayableCardTypes(state, state.them);

    const theme = createTheme({
        typography: {fontSize: 10}
    });
    //theme.typography[theme.breakpoints.up('sm')] = {fontSize:12};
    //theme.typography[theme.breakpoints.up('md')] = {fontSize:12};
    //theme.typography[theme.breakpoints.up('lg')] = {fontSize:12};

  return (
    <ThemeProvider theme={theme}>
        <Container fixed>
          <h2>Clash of Cultures Combat Simulator</h2>

            <Grid container>
                <Player playerName={'Your'} options={state.us} onOptionChange={handleOurOptionChange} playableCardTypes={playableCardTypesYou}/>
                <Player playerName={'Their'} options={state.them} onOptionChange={handleTheirOptionChange} playableCardTypes={playableCardTypesThem}/>
            </Grid>

            <Grid container>
                {['City', 'Fort', 'Temple', 'Amphibious', 'Eclipse', 'Trojan'].map(x =>
                    <Grid item xs={3} sm={2} lg={1} key={x}>
                        <FormControlLabel
                            control={<Switch name={x.toLowerCase()} checked={state[x.toLowerCase()]} onChange={handleChangeCheckbox}/>}
                            label={x}/>
                    </Grid>)}
            </Grid>

            <button onClick={go}>Go</button>

            {state.pWin && <p>Probability you {(!state.sea && !state.us.attacking) ? <span>do not lose:</span> : <span>win:</span>}
            {Math.round(state.pWin*100)}%</p>}

        </Container>
    </ThemeProvider>
  );
};
