import React, { useState } from 'react';
import {Player} from './Player';
import * as C from '../models/components'
import {simulateCombat, getPlayableCardTypes} from '../models/combat'
import { useTracker } from 'meteor/react-meteor-data';
import _ from 'lodash';

export const App = () => {
    const initialState = {
        fort: false,
        sea: false,
        city: true,
        amphibious: false,
        eclipse: false,
        us: {},
        them: {}
    };
    ['us', 'them'].forEach(function(who)  {
        initialState[who] = {
            civ: C.NOCIV,
            leader: C.NOLEADER,
            abilityValue: '',
            saveLeader: true,
            attacking: who === 'us',
            cards: [],
            wonders: Array(C.Wonders.length).fill(false),
            advances: Array(C.Advances.length).fill(false), // tribal warfare is scalar
            army: 'lice',
            resources: {food: 7, wood: 7, ore: 7, gold: 7, culture: 10, mood: 10,
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
        setState({...state});
    };

    const handleTheirOptionChange = function(player) {
        mutuallyExclude(player, state.us);
        setState({...state});
    };

    const handleChangeOption = function(e) {
        let { value, name } = e.target;
        setState({...state, [name]: value});
    }

    const handleChangeCheckbox = function(e) {
        let {value, name} = e.target;
        setState({...state, [name]: !state[name]})
    }
    const go = function() {
        const [pWin, avgStanding, players] = simulateCombat(state, 10000);
        setState({...state, pWin:pWin});
        console.log(state);
    }

    const playableCardTypesYou = getPlayableCardTypes(state, state.us);
    const playableCardTypesThem = getPlayableCardTypes(state, state.them);

  return (
    <div className="clash-sim">
      <h1>Clash of Cultures Combat Simulator</h1>

      <div className="filters">
        <label>
            Fortress
          <input
              name="fort"
              type="checkbox"
              checked={ state.fort }
              onChange={handleChangeCheckbox}
          />
        </label>&nbsp;&nbsp;
          <label>City
              <input name="city" type="checkbox" checked={state.city} onChange={handleChangeCheckbox}/>
          </label>&nbsp;&nbsp;
          <label>Amphibious
              <input name="amphibious" type="checkbox" checked={state.amphibious} onChange={handleChangeCheckbox}/>
          </label>&nbsp;&nbsp;
          <label>Eclipse
              <input name="eclipse" type="checkbox" checked={state.eclipse} onChange={handleChangeCheckbox}/>
          </label>

      </div>

        <Player playerName={'You'} options={state.us} onOptionChange={handleOurOptionChange} playableCardTypes={playableCardTypesYou}/>

        <Player playerName={'Them'} options={state.them} onOptionChange={handleTheirOptionChange} playableCardTypes={playableCardTypesThem}/>

        <button onClick={go}>Go</button>

        {state.pWin && <p>Win probability: {Math.round(state.pWin*100)}%</p>}

    </div>
  );
};
