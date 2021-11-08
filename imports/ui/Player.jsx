import React from 'react';
import * as C from '../models/components';
import { Button, ButtonGroup, Card, Select, Switch, MenuItem, Slider, CardContent, Grid, Radio, Checkbox, FormControlLabel, Stack} from '@mui/material';
import Collapse from '@mui/material/Collapse';


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

        let { value, name } = e.target;
        options.civ = Number(value);

        onOptionChange(options);
    }

    const fOnLeaderChange = function(leader) { return function() {
        options.leader = leader;
        options.abilityValue = '';
        onOptionChange(options);
    }};

    const onAdvanceChange = function(e) {
        let { value, name } = e.target;
        options.advances[Number(name)] = !options.advances[Number(name)];
        onOptionChange(options);
    }

    const onAdvanceValueChange = function(e) {
        let {value, name} = e.target;
        options.advances[Number(name)] = value;
        onOptionChange(options);
    }

    const onWonderChange = function(e) {
        let {value, name} = e.target;
        options.wonders[Number(name)] = !options.wonders[Number(name)];
        onOptionChange(options);
    }

    const onCheckboxChange = function(e) {
        let { value, name } = e.target;
        options[name] = !options[name];
        onOptionChange(options);
    }

    const onChangeResource = function(e) {
        let {value, name} = e.target;
        options.resources[name] = Number(value);
        onOptionChange(options);
    }

    const addCard = function(e) {
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

    const onGenericChange = function(e) {
        let { value, name } = e.target;
        options[name] = value;
        onOptionChange(options);
    };

    const onChangeSevenEach = function() {
        resources.forEach(function(r) {options.resources[r]=sevenEach?0:7});
        onOptionChange(options);
    };


    const onGenericNumberChange = function(e) {
        let { value, name } = e.target;
        options[name] = Number(value);
        onOptionChange(options);
    };

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
        <Grid container item xs={12} lg={6}>
            {/* UNITS */}
            <Grid container item className="card-container">
                <Grid item xs={2}>
                    {playerName} {~options.army.indexOf('s') && 'Navy' || 'Army'}
                </Grid>
                <Grid item xs={7}>
                    <ButtonGroup>
                        {options.army.split('').map((t,i) => (
                            <Button key={i} onClick={fRemoveUnit(t)}>{t.toUpperCase()}</Button>
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
            <Grid container item className="card-container">
                <Grid item xs={2}/>
                <Grid item xs={7}>
                    <ButtonGroup>
                        {'slice'.split('').map(t => <Button key={t} variant="contained" onClick={fAddUnit(t)}>{t.toUpperCase()}</Button>)}
                    </ButtonGroup>
                </Grid>
                {options.civ !== C.BARBARIAN && !!~options.army.indexOf('l') && !~options.army.indexOf('s') &&
                <Grid item xs={3}>
                    <FormControlLabel
                        control={<Switch
                                    name="saveLeader"
                                    checked={Boolean(options.saveLeader)}
                                    onChange={onCheckboxChange}/>}
                        label="Save Leader"/>
                </Grid>}
            </Grid>

            {/* CIVILIZATIONS and LEADERS */}
            <Grid container item className="card-container">
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
                        <Grid item xs={3} key={leader.id}>
                            <FormControlLabel className="leader-radio"
                                control={<Radio
                                            name={playerName+"leader"}
                                            checked={leader.id === options.leader}
                                            onChange={fOnLeaderChange(leader.id)}/>}
                                label={leader.name}/>
                        </Grid>
                    )}
            </Grid>

            {/* LEADER ABILITY */}
            {C.Leaders[options.leader].ability &&
            <Grid container item className="card-container">
                <Grid item xs={3}>
                    <div className="float-end">{C.Leaders[options.leader].ability}</div>
                </Grid>
                {C.Leaders[options.leader].type === 'Boolean' &&
                    <Grid item xs={9}><Switch name="abilityValue" checked={options.abilityValue || false} onChange={onCheckboxChange}/></Grid>}
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
                        {(options.abilityValue || 0) + ' ' + C.Leaders[options.leader].units}
                    </Grid>
                    </>
                    }
            </Grid>}
            <Grid container item className="card-container">
                {/* ADVANCES, WONDERS, GREAT PEOPLE */}
                <Grid item xs={6}>
                    {options.civ !== C.BARBARIAN && options.civ !== C.PIRATE &&
                    <Grid container>

                    {Object.keys(advances).map((a) =>
                        <Grid item key={a} sm={6} xs={12}>
                            <FormControlLabel
                                control={<Checkbox
                                            type="checkbox"
                                            name={String(a)}
                                            checked={ Boolean(options.advances[a]) }
                                            onChange = {onAdvanceChange}/>}
                                label={C.Advances[a].name}/>

                            {C.Advances[a].type === "Integer" &&
                                <Grid container>
                                    <Grid item xs={12}>
                                        <Slider aria-label={Number(options.advances[a]) + ' ' + C.Advances[a].units}
                                                name={a}
                                                min={C.Advances[a].min}
                                                max={C.Advances[a].max}
                                                defaultValue={Number(Number(options.advances[a]))} onChange={onAdvanceValueChange}/>
                                    </Grid>
                                </Grid>
                            }
                        </Grid>)}
                        <Grid item sm={6} xs={12}>
                            <FormControlLabel
                                control={<Checkbox type="checkbox" name="greatWarlord" checked={Boolean(options.greatWarlord)} onChange={onCheckboxChange}/>}
                                label="Great Warlord"/>
                        </Grid>
                        {C.Wonders.map((w, i) => (
                            <Grid item key={w} sm={6} xs={12}>
                                <FormControlLabel
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

                                    <MenuItem key={C.UNKNOWNCARD} value={C.UNKNOWNCARD}>Unknown</MenuItem>

                                    {C.Cards.map((card, i) =>
                                        <MenuItem key={i} value={String(i)}>{~playableCardTypes.indexOf(i) ? card.name : '-'+card.name+'-'}</MenuItem>)
                                    }

                                </Select>
                                <Button variant="outlined" onClick={function(e){deleteCard(i); e.preventDefault();}}>-</Button>
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
                                    <Slider type="text" name={r} min={0} max={7} value={options.resources[r]} onChange={onChangeResource}/>
                                </Grid>
                                <Grid item xs={1}>
                                    {options.resources[r]}{r[0]}
                                </Grid>
                            </React.Fragment>)}
                        </Grid>
                    </Collapse>
                </Grid>}


        </Grid>
    );
}