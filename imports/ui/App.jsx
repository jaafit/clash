import React, { useState } from 'react';
import {Player} from './Player';
import {Results} from './Results';
import * as C from '../models/components'
import {simulateCombat, getPlayableCardTypes} from '../models/combat'
import { Grid, FormControlLabel, Switch, Button } from '@mui/material';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';

export const App = () => {
    const initialOptions = {
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
        initialOptions[who] = {
            civ: C.NOCIV,
            leader: C.NOLEADER,
            abilityValue: undefined,
            saveLeader: true,
            attacking: who === 'us',
            cards: [],
            wonders: Array(C.Wonders.length).fill(false),
            advances: Array(C.Advances.length).fill(false), // tribal warfare is scalar
            useSteelWeapons: true,
            greatWarlord: false, // todo implement
            army: '',
            resources: {food: 7, wood: 7, ore: 7, gold: 7, culture: 7, mood: 7,
                need_food: false, need_wood: false, need_ore: false, need_culture: false
            }
        }
    });

    const [options, setOptions] =  useState(initialOptions)
    const [results, setResults] = useState({})

    const mutuallyExclude = function(thisPlayer, thatPlayer) {
        thatPlayer.attacking = !thisPlayer.attacking;
        thisPlayer.wonders.forEach(function(have, i) {if (have) thatPlayer.wonders[i] = false;});
        if (thatPlayer.civ === thisPlayer.civ)
            thatPlayer.civ = C.NOCIV;
    }

    const handleOurOptionChange = function(player) {
        mutuallyExclude(player, options.them); // todo needs to use a function so that we use actual state
        options.sea = ~player.army.indexOf('s');
        setOptions({...options});
    };

    const handleTheirOptionChange = function(player) {
        mutuallyExclude(player, options.us);
        options.sea = ~player.army.indexOf('s');
        setOptions({...options});
    };

    const handleChangeOption = function(e) {
        let { value, name } = e.target;
        setOptions({...options, [name]: value});
    }

    const handleChangeCheckbox = function(e) {
        let {value, name} = e.target;
        if (options.city && name === 'city')
            options.fort = options.temple = false;
        if (!options.city && ['fort', 'temple'].some(x => name === x && !options[name] ))
            options.city = true;
        setOptions({...options, [name]: !options[name]})
    }

    const onReset = function() {
        setOptions(initialOptions);
        setResults({});
    }

    const go = function() {
        const results = simulateCombat(options, 30000);
        setOptions(options);
        setResults(results)
        setTimeout(function() {window.scrollTo(0,document.body.scrollHeight)}, 100); // wait for update
    }

    const playableCardTypesYou = getPlayableCardTypes(options, options.us);
    const playableCardTypesThem = getPlayableCardTypes(options, options.them);

    const theme = createTheme({
        palette: {mode: 'dark'},
        typography: {fontSize: 10}
    });
    //theme.typography[theme.breakpoints.up('sm')] = {fontSize:12};
    //theme.typography[theme.breakpoints.up('md')] = {fontSize:12};
    //theme.typography[theme.breakpoints.up('lg')] = {fontSize:12};

  return (
        <ThemeProvider theme={theme}>
            <CssBaseline>
            <Container fixed>
                <Grid container spacing={2}>
                    <Grid item xs={9}><h3>Clash M.E. Simulator</h3></Grid>
                    <Grid item xs={3}><Button endIcon={<RotateLeftIcon/>} onClick={onReset}>Reset</Button></Grid>

                    <Grid container item xs={12} spacing={3}>
                        <Grid container item xs={12} lg={6}>
                            <Player playerName={'Your'} options={options.us} onOptionChange={handleOurOptionChange} playableCardTypes={playableCardTypesYou}/>
                        </Grid>
                        <Grid container item xs={12} lg={6}>
                            <Player playerName={'Their'} options={options.them} onOptionChange={handleTheirOptionChange} playableCardTypes={playableCardTypesThem}/>
                        </Grid>
                    </Grid>

                    <Grid container item xs={12} spacing={1}>
                        {['City', 'Fort', 'Temple', 'Amphibious', 'Eclipse', 'Trojan'].map(x =>
                            <Grid item xs={4} md={2} key={x}><Paper sx={{p:1}}>
                                <FormControlLabel
                                    control={<Switch name={x.toLowerCase()} checked={options[x.toLowerCase()]} onChange={handleChangeCheckbox}/>}
                                    label={x}/>
                            </Paper></Grid>)}
                    </Grid>

                    <Grid item xs={12}>
                        <Button variant="contained" size="large" onClick={go} endIcon={<PlayCircleOutlineIcon/>}>Go</Button>
                    </Grid>
                    <Grid item xs={12}>
                        {results.pVictory !== undefined && <Results options={options} results={results} />}
                    </Grid>
                </Grid>
            </Container>
            </CssBaseline>
        </ThemeProvider>
  );
};
