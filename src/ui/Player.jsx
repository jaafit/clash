import React from 'react';
import * as C from '../models/components';
import { Button, ButtonGroup, Select, Switch, MenuItem, Slider, Grid, Radio, Checkbox, FormControlLabel, Stack} from '@mui/material';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Box from '@mui/material/Box';


export const Player = ({playerName, options, onOptionChange, playableCardTypes}) => {

    const fAddUnit =  function(t) { return function() {
        const navalLeader = C.Leaders[options.leader] && C.Leaders[options.leader].naval;
        if (t === 's') {
            const re = navalLeader ? /[ice]/g : /[lice]/g;
            options.army = options.army.replace(re, '');
        }
        if (t === 'l' && ~options.army.indexOf('l'))
            return;
        if (~'ice'.indexOf(t) || t === 'l' && !navalLeader)
            options.army = options.army.replace(/s/g, '');
        if (options.army.length >= 5)
            return;

        options.army += t;
        onOptionChange(options);
    }}

    const fRemoveUnit = function(t) { return function() {
        options.army = options.army.replace(t, '');
        onOptionChange(options);
    }}

    const onCivChange = function(e) {
        // clear civ advances
        if (options.civ)
            C.Civs[options.civ].advances.forEach(function (a) {
                options.advances[a] = false;
            })
        options.leader = C.NOLEADER;
        options.abilityValue = '';

        let { value } = e.target;
        options.civ = Number(value);

        onOptionChange(options);
    }

    const fOnLeaderChange = function(leader) { return function() {
        options.leader = leader;
        options.abilityValue = '';
        onOptionChange(options);
    }};

    const onAdvanceChange = function(e) {
        let { name } = e.target;
        options.advances[Number(name)] = !options.advances[Number(name)];
        onOptionChange(options);
    }

    const onAdvanceValueChange = function(e) {
        let {value, name} = e.target;
        options.advances[Number(name)] = value;
        onOptionChange(options);
    }

    const onWonderChange = function(e) {
        let {name} = e.target;
        options.wonders[Number(name)] = !options.wonders[Number(name)];
        onOptionChange(options);
    }

    const onCheckboxChange = function(e) {
        let { name } = e.target;
        options[name] = !options[name];
        onOptionChange(options);
    }

    const onChangeResource = function(e) {
        let {value, name} = e.target;
        options.resources[name] = Number(value);
        onOptionChange(options);
    }

    const addCard = function() {
        options.cards.push(C.UNKNOWNCARD);
        onOptionChange(options);
    };

    const onCardChange = function(e) {
        let {value, name} = e.target;
        options.cards[Number(name)] = Number(value);
        onOptionChange(options);
    };

    const deleteCard = function(i) {
        options.cards.splice(i, 1);
        onOptionChange(options);
    };

    // const onGenericChange = function(e) {
    //     let { value, name } = e.target;
    //     options[name] = value;
    //     onOptionChange(options);
    // };

    const onChangeSevenEach = function() {
        resources.forEach(function(r) {options.resources[r]=sevenEach?0:7});
        onOptionChange(options);
    };


    const onGenericNumberChange = function(e) {
        let { value, name } = e.target;
        options[name] = Number(value);
        onOptionChange(options);
    };

    const unitType = function(t) {
        return t === 's' && 'Ship' || t === 'l' && 'leader' || t === 'i' && 'Infantry' || t === 'c' && 'Cavalry' || t === 'e' && 'Elephant';
    }

    let advances = {};
    C.Advances.slice(0, C.nBasicAdvances).forEach(function(a, i){
        advances[i] = a;
    });
    if (options.civ)
        C.Civs[options.civ].advances.forEach(function(a) {
            advances[a] = C.Advances[a];
        });

    let leaders = C.Leaders.map((leader, i) => Object.assign(leader, {id: i}))
        .filter((leader) => leader.civ === options.civ);

    const resources = ['food', 'wood', 'ore', 'gold', 'culture', 'mood'];
    const sevenEach = resources.every(r => Number(options.resources[r]) === 7);

    return (
        <Paper sx={{bgcolor:'#000000', p:2}}><Grid container spacing={2}>
            {/* UNITS */}
            <Grid container item spacing={2} className="card-container">
                <Grid item xs={2}>
                    <Paper>
                        <p>{playerName} {~options.army.indexOf('s') && 'Navy' || 'Army'}</p>
                    </Paper>
                </Grid>
                <Grid item xs={7}>
                    <ButtonGroup>
                        {options.army.split('').map((t,i) => (
                            <Tooltip key={i} title={'Delete'}><Button onClick={fRemoveUnit(t)}>{t.toUpperCase()}</Button></Tooltip>
                        ))}
                    </ButtonGroup>
                </Grid>
                <Grid item xs={3}>
                    <FormControlLabel
                        control={<Switch name="attacking" checked={options.attacking} onChange={onCheckboxChange}/>}
                        label="Attacking"/>
                </Grid>
            </Grid>

            {/* ADD UNITS */}
            <Grid container item spacing={2} className="card-container">
                <Grid item xs={2}/>
                <Grid item xs={6}>
                    <ButtonGroup>
                        {'lecis'.split('').map(t =>
                            <Tooltip key={t} title={unitType(t)}><Button variant="contained" onClick={fAddUnit(t)}>{t.toUpperCase()}</Button></Tooltip>)}
                        <Tooltip title={'Rightmost units are killed first except that the leader will be saved on the final roll if his army wins.'}>
                            <Button variant="text"><HelpOutlineIcon/></Button></Tooltip>
                    </ButtonGroup>
                </Grid>
            </Grid>

            {/* CIVILIZATIONS and LEADERS */}
            <Grid container item spacing={1} className="card-container">
                <Grid item xs={3}>
                    <Select name={'civ'} value={options.civ} onChange={onCivChange}>
                        { C.Civs.map( (civ, i) => <MenuItem
                            key={i}
                            value={i}
                        >{civ.name}</MenuItem> ) }
                    </Select>
                </Grid>
                    {(options.civ !== C.NOCIV && options.civ !== C.BARBARIAN) &&
                    leaders.map(leader =>
                        <Grid item xs={3} key={leader.id}><Paper>
                            <FormControlLabel className="leader-radio"
                                control={<Radio
                                            name={playerName+"leader"}
                                            checked={leader.id === options.leader}
                                            onChange={fOnLeaderChange(leader.id)}/>}
                                label={leader.name}/>
                        </Paper></Grid>
                    )}
            </Grid>

            {/* LEADER ABILITY */}
            {C.Leaders[options.leader].ability &&
            <Grid container item className="card-container">
                <Grid item xs={3}>
                    <Box sx={{p:1}}>{C.Leaders[options.leader].ability}</Box>
                </Grid>
                {C.Leaders[options.leader].type === 'Boolean' &&
                    <Grid item xs={9}><Tooltip title={'Does this ability apply here?'}>
                        <Switch name="abilityValue" checked={options.abilityValue || false} onChange={onCheckboxChange}/></Tooltip>
                    </Grid>}
                {C.Leaders[options.leader].type === 'Integer' &&
                    <>
                    <Grid item xs={6}>
                        <Slider
                                name="abilityValue"
                                min={C.Leaders[options.leader].min}
                                max={C.Leaders[options.leader].max}
                                value={options.abilityValue || 0}
                                onChange={onGenericNumberChange}/>
                    </Grid>
                    <Grid item xs={3}>
                        <Box sx={{p:1}}>{(options.abilityValue || 0) + ' ' + C.Leaders[options.leader].units}</Box>
                    </Grid>
                    </>
                    }
            </Grid>}
            <Grid container item className="card-container">
                {/* ADVANCES, WONDERS, GREAT PEOPLE */}
                <Grid item xs={6}>
                    {options.civ !== C.BARBARIAN && options.civ !== C.PIRATE &&
                    <Grid container spacing={1}>
                        <Grid item sm={6} xs={12}>
                            <FormControlLabel
                                control={<Checkbox
                                    type="checkbox"
                                    name={'useSteelWeapons'}
                                    checked={ Boolean(options.useSteelWeapons) }
                                    disabled={ Boolean(!options.advances[C.STEEL_WEAPONS]) }
                                    onChange = {onCheckboxChange}/>}
                                label={'Use Steel Wep'}/>
                        </Grid>

                    {Object.keys(advances).map((a) =>
                        <Grid item key={a} sm={6} xs={12}><Paper className="player-option">
                            <FormControlLabel
                                control={<Checkbox
                                            type="checkbox"
                                            name={String(a)}
                                            checked={ Boolean(options.advances[a]) }
                                            onChange = {onAdvanceChange}/>}
                                label={C.Advances[a].name}/>

                            {C.Advances[a].type === "Integer" &&
                                <Grid container>
                                    <Grid item xs={10}>
                                        <Slider aria-label={Number(options.advances[a]) + ' ' + C.Advances[a].units}
                                                name={a}
                                                min={C.Advances[a].min}
                                                max={C.Advances[a].max}
                                                value={Number(Number(options.advances[a]))} onChange={onAdvanceValueChange}/>
                                    </Grid>
                                    <Grid item xs={2}>
                                        <Box sx={{p:1}}>{options.advances[a]}</Box>
                                    </Grid>
                                </Grid>
                            }
                        </Paper></Grid>)}
                        <Grid item sm={6} xs={12}>
                            <FormControlLabel
                                className={'player-option event'}
                                control={<Checkbox type="checkbox" name="greatWarlord" checked={Boolean(options.greatWarlord)} onChange={onCheckboxChange}/>}
                                label="Great Warlord"/>
                        </Grid>
                        {C.Wonders.map((w, i) => (
                            <Grid item key={w} sm={6} xs={12}>
                                <FormControlLabel
                                    className={'player-option wonder'}
                                    control={<Checkbox type="checkbox" name={String(i)} checked={Boolean(options.wonders[i])} onChange={onWonderChange}/>}
                                    label={w}/>
                            </Grid>))}
                    </Grid>}
                </Grid>

                {/* CARDS */}
                <Grid item xs={6}>
                    {options.civ !== C.BARBARIAN && options.civ !== C.PIRATE &&
                    <div>
                        {options.cards.map((card, i) =>
                            <Stack direction="row" key={i}>
                                <Select name={String(i)} value={card} onChange={onCardChange}>

                                    <MenuItem key={C.UNKNOWNCARD} value={C.UNKNOWNCARD}>Random</MenuItem>

                                    {C.Cards.map((card, i) =>
                                        <MenuItem key={i} value={String(i)}>{~playableCardTypes.indexOf(i) ? card.name : '-'+card.name+'-'}</MenuItem>)
                                    }

                                </Select>
                                <IconButton onClick={function(e){deleteCard(i); e.preventDefault();}}>
                                    <DeleteIcon/>
                                </IconButton>
                            </Stack>
                        )}
                        <div><Button onClick={addCard}>Add Card</Button></div>
                    </div>}
                </Grid>

            </Grid>

            {/* RESOURCES */}
            {options.civ !== C.BARBARIAN && options.civ !== C.PIRATE &&
                <Grid item className="card-container" xs={12}>
                    Resources:&nbsp;
                    <FormControlLabel
                        control={<Switch name="seveneach" onChange={onChangeSevenEach} checked={sevenEach}/>}
                        label={"7 each"}/>
                </Grid>}

            {options.civ !== C.BARBARIAN && options.civ !== C.PIRATE &&
                <Grid item xs={12} >
                    <Collapse in={!sevenEach}>
                        <Grid container spacing={2}>
                            {resources.map(r =>
                            <React.Fragment key={r}>
                                <Grid item xs={3} sm={2} md={1} lg={2}>
                                     <Tooltip title={r}><Slider type="text" name={r} min={0} max={7} value={options.resources[r]} onChange={onChangeResource}/></Tooltip>
                                </Grid>
                                <Grid item xs={1}>
                                    {options.resources[r]}{r[0].toUpperCase()}
                                </Grid>
                            </React.Fragment>)}
                        </Grid>
                    </Collapse>
                </Grid>}
        </Grid></Paper>
    );
}