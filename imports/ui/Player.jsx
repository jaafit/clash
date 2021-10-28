import React from 'react';
import * as C from '../models/components';

export const Player = ({playerName, options, onOptionChange, playableCardTypes}) => {

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

    const onLeaderChange = function(e) {
        let { value, name } = e.target;
        options.leader = Number(value);
        options.abilityValue = '';
        onOptionChange(options);
    };

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
        .filter((leader, i) => leader.civ === options.civ || i === C.NOLEADER);

    return (
        <div>
            <h1>{playerName}</h1>

            <label>Army <input type="text" name={'army'} value={options.army} onChange={onGenericChange}/></label>

            <label>Attacking <input type="checkbox" name="attacking" checked={options.attacking} onChange={onCheckboxChange}/></label>&nbsp;&nbsp;
            {options.civ !== C.BARBARIAN && options.civ !== C.NOCIV && <label>
                Save Leader
                <input
                    name="saveLeader"
                    type="checkbox"
                    checked = {Boolean(options.saveLeader)}
                    onChange={onCheckboxChange}/>

            </label>}

            <div>
                <label>Civ
                    <select name={'civ'} value={options.civ} onChange={onCivChange}>
                        { C.Civs.map( (civ, i) => <option
                            key={i}
                            value={i}
                        >{civ.name}</option> ) }
                    </select>
                </label>
                {(options.civ !== C.NOCIV && options.civ !== C.BARBARIAN) &&
                    <label>Leader
                        <select name="leader" value={options.leader} onChange={onLeaderChange}>
                            {leaders.map(leader => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
                        </select>
                    </label>}
                {C.Leaders[options.leader].ability &&
                <label>{C.Leaders[options.leader].ability}
                    {C.Leaders[options.leader].type === 'Boolean' &&
                        <input type="checkbox" name="abilityValue" checked={options.abilityValue} onChange={onCheckboxChange}/>}
                    {C.Leaders[options.leader].type === 'Integer' &&
                        <input type="text" size="3" name={"abilityValue"} value={options.abilityValue} onChange={onGenericNumberChange}/>}
                </label>}
            </div>


            {options.civ !== C.BARBARIAN && <div>
                {Object.keys(advances).map((a) =>
                    <label key={a}>
                        {C.Advances[a].name}
                        <input
                            type="checkbox"
                            name={a}
                            checked={ Boolean(options.advances[a]) }
                            onChange = {onAdvanceChange}
                        />
                        {C.Advances[a].type === "Integer" &&
                            <input type="text" name={a} value={Number(options.advances[a])} onChange={onAdvanceValueChange}/>}
                    </label>)}
            </div>}

            {options.civ !== C.BARBARIAN && <div>
                <label>Wonders
                    {C.Wonders.map((w, i) => (<label key={w} >{w}
                        <input type="checkbox" name={i} checked={Boolean(options.wonders[i])} onChange={onWonderChange}/>
                    </label>))}
                </label>
            </div>}

            {options.civ !== C.BARBARIAN && <div>
                <label>Cards
                    {options.cards.map((card, i) =>
                        <div key={i}>
                            <select name={i} value={card} onChange={onCardChange}>

                                <option key={C.UNKNOWNCARD} value={C.UNKNOWNCARD}>Unknown</option>

                                {C.Cards.map(function (card, i) {
                                    if (!~playableCardTypes.indexOf(i)) // highlight unplayable cards
                                        card.name = '-'+card.name+'-';
                                    return (<option key={i} value={i}>{card.name}</option>);
                                })}

                            </select>
                            <button id={"delete"+i} key={"delete"+i} onClick={function(e){deleteCard(i); e.preventDefault();}}>-</button>
                        </div>
                    )}
                    <div><button id="add" key="add" onClick={addCard}>+</button></div>
                </label>
            </div>}

            {options.civ !== C.BARBARIAN && <div>Resources &nbsp;
                {['food', 'wood', 'ore', 'gold', 'culture', 'mood'].map(r => (
                    <label key={r}>
                        {r}
                        <input type="text" size="3" name={r} value={options.resources[r]} onChange={onChangeResource}/>&nbsp;&nbsp;
                    </label>
                ))}
            </div>}
        </div>
    );
}