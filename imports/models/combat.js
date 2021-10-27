import * as C from './components';
import {cloneDeep} from 'lodash';

//simulateEclipse = 'eclipse' in sys.argv

Object.defineProperties(Array.prototype, {
    count: {
        value: function(query) {
            let count = 0;
            for(let i=0; i<this.length; i++)
                if (this[i]==query)
                    count++;
            return count;
        }
    }
});
String.prototype.count=function(c) {
    let result = 0, i = 0;
    for(i;i<this.length;i++)if(this[i]===c)result++;
    return result;
};
function def(v,d) { return v !== undefined ? v : d; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function logGameState(players) {
    console.log('---------------------------');
    for (let i = 1; i< arguments.length; i++)
        console.log(arguments[i])
    console.log(players.us.army, 'vs', players.them.army);
    console.log(players.us.resources, 'vs', players.them.resources);
}

//todo figure out best way to spend resources if scarce
// resources:
// 2F to cancel The Siege
// 2W for siegecraft roll
// 1O and 1W for Fireworks - cancel hit 1st round
// 2O for siegecraft block
// 1O for steel weapons
// 1O for Akbar's +1 per ele for battle
// 1O for GoToba's +2 for battle
// 1culture for Immortals +1
// 1culture for Pygmalion's hit cancel (once/battle)
// 2culture for Qin's hit cancel (once/battle)
/*function resetResources(options) {
    ['food', 'wood', 'ore', 'gold', 'culture'].forEach(function(res) {
        if (options.resources[res] < 0)
            options.resources['need_'+res] = true;
        options.resources[res] = options.resources['starting_' + res];
    })
}*/
function haveResource(player, amt, type) {
    let have = player.resources[type];
    if (type !== 'culture')
        have += player.resources['gold'];
    if (have < amt)
        player[type]--; // flag it for ui
    return have >= amt
}
function spendResource(player, amt, type) {
    player[type] = Math.max(0, player[type] - amt)
    amt -= player[type];
    if (type !== 'culture')
        player['gold'] -= amt;
}

function addCards(cards, cardType, seenCards) {
    for (let i = 0; i < C.CardCounts[cardType] - seenCards.count(cardType); i++)
        cards.push(cardType);
}
function getAllCards(seenCards) {
    let cards = [];    
    C.Cards.forEach(function(c, i) { addCards(cards, i, seenCards);})
    return cards;
}
let UnseenCards = [];

// you tell ourArmy which cards you're playing in which order
// we'll work out which cards your opponents might have and randomly play for theirArmy
export function getPlayableCardTypes(options, us) {
    let playable = [];
    if (us.barbarian)
        return playable;
    
    if (!options.sea) {
        playable.push(C.ARCHERS);
        playable.push(C.PELTASTS);
        playable.push(C.ROUTING);
    }

    if (!us.attacking) {
        playable.push(C.DEFIANT);
        playable.push(C.PREPARED);
        // addCards(playable, C.RETREAT); no
    }

    if (!us.attacking && options.city) {
        playable.push(C.PEOPLE);
        playable.push(C.UPGRADED);
    }

    if (!(us.attacking && options.city))
        playable.push(C.GROUND);

    if (us.attacking) {
        playable.push(C.FLANKING);
        playable.push(C.WEDGE);
    }

    if (us.attacking && options.city)
        playable.push(C.SIEGE);

    playable = playable.concat([C.MORALE, C.MARTYR, C.SURPRISE, C.SCOUTS]);

    // filter out based on army/ship/fortress
    // todo can Cyrus play these though?
    playable = playable.filter(function(c) {
        return C.Cards[c].army && !options.sea
            || C.Cards[c].ship && options.sea
            || C.Cards[c].fort && options.fort;
    })

    return playable;
}

/*function getPlayableCards(options, us, them) {
    let playable = [];
    if (!us.cards.length)
        return playable;

    let playableTypes = getPlayableCardTypes(options, us)
    playableTypes.forEach(function(t) { addCards(playable, t, them.cards) });
    return playable;
}*/


function preRollEffects(options, us, them, round) {
    // todo Emperor Jimmu is a special case where a leader can affect battle when not present.
    let cvb = {cv: 0, bonusCV: 0, blocks:0};

    if (!us.attacking && options.fort && round === 0) {
        if (them.advances[C.SIEGECRAFT] && haveResource(them, 2, 'ore'))
            spendResource(them, 2, 'ore');
        else
            cvb.blocks++;
    }

    if (us.attacking && them.wonders[C.GREATWALL] && round === 0)
        cvb.bonusCV -= 2;

    if (us.advances[C.STEEL_WEAPONS]) {
        let needOre = !us.advances[C.METALLURGY] || them.advances[C.STEEL_WEAPONS]
        if (!needOre || haveResource(us, 1, 'ore')) {
            if (them.advances[C.STEEL_WEAPONS])
                cvb.bonusCV++;
            else
                cvb.bonusCV += 2;
            if (needOre)
                spendResource(us, 1, 'ore');
        }
    }

    if (us.advances[C.FANATICISM] && round === 0)
        cvb.bonusCV += 2;
    
    if (us.advances[C.IMMORTALS] && haveResource(us, 1, 'culture')) {
        let spend = Math.min(4, us.resources.culture)
        cvb.bonusCV += spend;
        spendResource(us, spend, 'culture');
    }
    
    if (options.sea && us.advances[C.BIREMES]) {
        if (round === 0 || !them.advances[C.WARSHIPS])
            cvb.bonusCV += 2;
    }

    if (us.advances[C.WARSHIPS] && round === 0)
        if (options.sea || us.attacking && options.amphibious)
            cvb.blocks++;

    if (us.playedCard === C.PELTASTS && !options.sea)
        for (let i = 0; i < us.army.length; i++)
            if (randInt(1,3) === 3)
                cvb.blocks++; // todo this is only supposed to be "during remove casualties"

    if (them.playedCard === C.DEFIANT && us.attacking)
        cvb.bonusCV -= them.army.length

    if (us.playedCard === C.MORALE)
        cvb.bonusCV += 2;

    if (us.playedCard === C.UPGRADED && !us.attacking && options.city)
        cvb.blocks++;

    if (us.playedCard === C.SURPRISE)
        cvb.bonusCV += 1;

    if (us.playedCard === C.SIEGE && !options.sea)
        cvb.bonusCV += 1;

    if (us.playedCard === C.WEDGE && !options.sea && us.attacking)
        cvb.bonusCV += them.army.length;

    if (us.advances[C.TRIBAL_WARFARE] && !them.barbarian && !options.sea)
        cvb.bonusCV += Math.min(4, us.advances[C.TRIBAL_WARFARE]);

    if (us.leader === C.AHUITZOTL && us.abilityValue)
        cvb.blocks++;

    if (us.leader === C.NEBUCHADNEZZAR && options.city && us.attacking && us.abilityValue)
        cvb.bonusCV += 2;

    if (us.leader === C.NABOPOLASSAR && us.abilityValue)
        cvb.bonusCV += 2;

    if (us.leader === C.HANNO && options.sea)
        cvb.bonusCV += 2;

    return cvb;
}

function postRollEffects(cvb, options, us, them, round) {
    let bonusCap = 1000;
    if (them.advances[C.ELEPHANTS] && ~them.army.indexOf('e') && round === 0)
        bonusCap = 2

    // todo conditional on being hit at all
    if (us.advances[C.FIREWORKS] && round === 0) {
        if (haveResource(us, 1, 'food') && haveResource(us, 1, 'ore')) {
            cvb.blocks += 1
            spendResource(us, 1, 'food');
            spendResource(us, 1, 'ore');
        }
    }

    if (!options.sea && us.wonders[C.GREATARENA] && cvb['bonusCV'] < bonusCap
        && !us.usedArena && (cvb['cv'] + cvb['bonusCV']) % 5 === 4 && haveResource(us, 1, 'culture')) {
        us.usedArena = true;
        spendResource(us, 1, 'culture');
        cvb.bonusCV += 1;
    }

    // finally, cap the bonus CV at 2 against Persian elephants
    cvb.bonusCV = Math.min(bonusCap, cvb.bonusCV);

    // now calculate hits
    cvb.hits = Math.floor((cvb.cv + cvb.bonusCV) / 5)
}

function clashAbilities(roll, cvb, options, us, them, round) {
    let eles = us.army.count('e');
    let cavs = us.army.count('c');
    let infs = us.army.count('i');
    let canClash = true;
    if (them.playedCard === C.GROUND && !(them.attacking && options.city))
        canClash = false;
    if (them.playedCard === C.SIEGE && them.attacking && options.city) {
        if (haveResource(us, 2, 'food'))
            spendResource(us, 2, 'food');
        else
            canClash = false;
    }

    let oneFace = roll.indexOf('1l')
    let ri = randInt(2,11);
    if (~us.army.indexOf('l') && ~oneFace && canClash) {
        roll[oneFace] = C.Faces[ri];
        if (!roll[oneFace])
            debugger;
    }

    let sorted = roll.sort(function(a, b) { return b[0] - a[0] }) // lower elephants go first
    sorted.forEach(function(r) {
        cvb.cv += Number(r[0]);

        if (canClash) {            
            if (eles && r[1] === 'e') {
                eles--;
                cvb.blocks++
                cvb.cv -= Number(r[0]);
            }
    
            if (cavs && r[1] === 'c') {
                cavs--;
                cvb.bonusCV += 2

                us.usedHorsemanship = us.usedHorsemanship || false;
                if (us.advances[C.HORSEMANSHIP] && round === 0 && !us.attacking && options.fort && !us.usedHorsemanship) {
                    cvb.bonusCV++;
                    us.usedHorsemanship = true;
                }
            }
    
            if (infs && r[1] === 'i') {
                infs--;
                cvb.bonusCV++
            }
        }
    });

    return cvb;

}
function applyHits (player, hits) {
    if (hits <= 0)
        return;

    let alive = player.army.length - hits;
    if (alive <= 0) {
        player.army = '';
        return
    }

    // find the best (first) subset that the original army had
    const bestCompositions = player.subsets[alive];
    for (let i = 0; i < bestCompositions.length; i++)
        if (['l','i','c','e'].every(t => bestCompositions[i].count(t) <= player.army.count(t) )) {
            player.army = bestCompositions[i];
            return;
        }
}

function preRollCards(options, us, them, round) {
    if (us.playedCard === C.SCOUTS) {
        if (them.playedCard in getPlayableCardTypes(options, us))
            us.cards.push(them.playedCard)
        them.playedCard = undefined;
    }

    if (us.playedCard === C.MARTYR || them.playedCard === C.MARTYR)
        applyHits(us, 1);
    
    if (them.playedCard === C.MARTYR)
        us.playedCard = undefined; // todo some effects benefit from this

    if (them.playedCard === C.ARCHERS && !options.sea && randInt(1,3) === 3)
        applyHits(us, 1);

}

function postCasualtiesEffects(ourCVB, theirCVB, options, us, them, round) {
    let ourKills = Math.min(ourCVB['hits'] - theirCVB['blocks'], them.army.length);
    let theirKills = Math.min(theirCVB['hits'] - ourCVB['blocks'], us.army.length);

    if (us.playedCard === C.ROUTING && !options.sea) {
        if (ourKills >= theirKills && randInt(1,3) === 3)
            applyHits(them, 1); // cannot be canceled
    }

    if (us.playedCard === C.SURPRISE && ourKills > 0) {
        let card = UnseenCards.shift();
        if (card in getPlayableCardTypes(options, us))
            us.cards.push(card);
    }
}

export function roll (options, us, them, round) {
    let roll = [];

    let extraRolls = 0;
    if (round === 0 && !us.attacking && options.fort ) {
        if (them.advances[C.SIEGECRAFT] && haveResource(them,2, 'wood'))
            spendResource(them, 2, 'wood');
        else
            extraRolls++;
    }
    if (us.playedCard === C.PEOPLE && options.city && !us.attacking)
        extraRolls++;
    if (us.playedCard === C.FLANKING && us.attacking)
        extraRolls++;
    if (us.playedCard === C.PREPARED && !us.attacking)
        extraRolls++;

    for (let i = 0; i < us.army.length + extraRolls; i++) {
        let r = randInt(0,11);
        roll.push(C.Faces[r]);
    }

    return roll
}

function playCard(playableCards, us, them) {
    // play our next card if possible
    us.playedCard = undefined;
    if (us.army.length < 5 && !(them.advances[C.SPARTANS] && us.army.length > them.army.length))
        while (us.cards.length) {
            let c = us.cards.shift();
            if (us.cards[0] === -1) { // play a random card
                for (let u = 0; u < UnseenCards.length; u++) {
                    if (~playableCards.indexOf(UnseenCards[u])) {
                        us.playedCard = UnseenCards[u];
                        UnseenCards.splice(u, 1);
                        return;
                    }
                }
            }
            else  // is it a known card type and playable?
            if (~playableCards.indexOf(c)) {
                us.playedCard = c;
                return;
            }
        }
}

// # Units can be ship, inf, cav, ele, leader
export function battle (options, players, startingRound=0, debug=false) {
    let fightOver = false;
    let round = startingRound;
    let ourPlayableCardTypes = getPlayableCardTypes(options, players.us);
    let theirPlayableCardTypes = getPlayableCardTypes(options, players.them);
    UnseenCards = getAllCards(players.us.cards.concat(players.them.cards));
    UnseenCards = shuffle(UnseenCards);
    players.us.cards = players.us.cards.slice(startingRound); //  skip cards if round starts later
    players.them.cards = players.them.cards.slice(startingRound);

    while (!fightOver) {
        playCard(ourPlayableCardTypes, players.us, players.them);
        playCard(theirPlayableCardTypes, players.them, players.us);
        if (debug) logGameState(players, 'played cards', C.Cards[players.us.playedCard], C.Cards[players.them.playedCard]);

        preRollCards(options, players.us, players.them, round);
        preRollCards(options, players.them, players.us, round);
        if (debug) logGameState(players, 'applied pre roll cards');
        if (players.us.army === '' || players.them.army === '')
            break;

        let ourCVB = preRollEffects(options, players.us, players.them, round)
        let theirCVB = preRollEffects(options, players.them, players.us, round)
        if (debug) logGameState(players, 'applied pre roll modifier', ourCVB, theirCVB);

        let ourRoll = roll(options, players.us, players.them, round);
        let theirRoll = roll(options, players.them, players.us, round)
        if (debug) logGameState(players, 'rolled', ourRoll, theirRoll);

        clashAbilities(ourRoll, ourCVB, options, players.us, players.them, round);
        clashAbilities(theirRoll, theirCVB, options, players.them, players.us, round);
        if (debug) logGameState(players, 'applied clash abilities', ourRoll, theirRoll, ourCVB, theirCVB);

        postRollEffects(ourCVB, options, players.us, players.them, round)
        postRollEffects(theirCVB, options, players.them, players.us, round)
        if (debug) logGameState(players, 'applied post roll modifiers', ourCVB, theirCVB)

        applyHits(players.us, theirCVB['hits'] - ourCVB['blocks'])
        applyHits(players.them, ourCVB['hits'] - theirCVB['blocks'])
        if (debug) logGameState(players, 'applied hits');

        postCasualtiesEffects(ourCVB, theirCVB, options, players.us, players.them);
        postCasualtiesEffects(theirCVB, ourCVB, options, players.them, players.us);
        if (debug) logGameState(players, 'applied post casualties effects');

        fightOver = players.us.army.length === 0 || players.them.army.length === 0 || options.eclipse;
        round++;
    }
    if (debug) logGameState(players, 'fight over');
    return players.us.army.length - players.them.army.length;
}

function getArmies(armySize) {
    if (armySize === 1)
        return ['s', 'l', 'i', 'c', 'e'];
    else if (armySize === 2)
        return ['ss', 'il', 'cl', 'el', 'ii', 'ic', 'ie', 'cc', 'ce', 'ee'];
    else if (armySize === 3)
        return ['sss', 'iil', 'icl', 'iel', 'ccl', 'cel', 'eel', 'iii', 'iic', 'iie', 'icc', 'ice', 'iee', 'ccc', 'cce', 'cee', 'eee'];
    else if (armySize === 4)
        return ['ssss', 'iiii', 'iiic', 'iiie', 'iicc', 'iice', 'iiee', 'iccc', 'icce', 'icee', 'ieee', 'cccc', 'ccce', 'ccee',
            'ceee', 'eeee', 'liii', 'liic', 'liie', 'licc', 'lice', 'liee', 'lccc', 'lcce', 'lcee', 'leee'];
}

export function getPwin(options, players, trials, startingRound=0, debug) {
    let totalWins = 0, totalSurvivors = 0;
    for (let i = 0; i < trials; i++) {
        let trialPlayers = cloneDeep(players);
        const survivors = battle(options, trialPlayers, startingRound, debug && i === 1);

        totalSurvivors += survivors;
        if (players.us.attacking && survivors >= 1 || players.them.attacking && survivors >= 0)
            totalWins++;
    }
    return [totalWins/trials, totalSurvivors/trials];
}

function findBestSubsets(options) {
    let ourSubsets = {}, theirSubsets = {};
    for (let subsetSize = 1; subsetSize < Math.max(options.us.army.length, options.them.army.length); subsetSize++) {
        function filterArmies(thisPlayer, subsetSize) {
            let filtered = thisPlayer.army.length > subsetSize && getArmies(subsetSize).filter(a => ['s','l','i','c','e'].every(t => a.count(t) <= thisPlayer.army.count(t)))
            || [thisPlayer.army];
            if (thisPlayer.saveLeader && ~thisPlayer.army.indexOf('l')) // if we opt to save the leader, filter out subsets without him
                filtered = filtered.filter(s => ~s.indexOf('l'))
            return filtered
        }
        // find all subsets of each army
        let ourTrialSubsets = filterArmies(options.us, subsetSize);
        let theirTrialSubsets = filterArmies(options.them, subsetSize);

        // make each subset fight each other subset
        let ourWorst = {};
        let theirWorst = {};
        ourTrialSubsets.forEach(function(ourTrialSubset) {
            theirTrialSubsets.forEach(function(theirTrialSubset) {
                let trialPlayers = cloneDeep(options);
                trialPlayers.us.army = ourTrialSubset;
                trialPlayers.us.subsets = ourSubsets;
                trialPlayers.them.army = theirTrialSubset;
                trialPlayers.them.subsets = theirSubsets;
                let pWin = getPwin(options, trialPlayers, 1000, 2)[0];

                if (!(ourTrialSubset in ourWorst) || ourWorst[ourTrialSubset]['p'] > pWin)
                    ourWorst[ourTrialSubset] = {p: pWin, opponent: theirTrialSubset};
                if (!(theirTrialSubset in theirWorst) || theirWorst[theirTrialSubset]['p'] < pWin)
                    theirWorst[theirTrialSubset] = {p: pWin, opponent: ourTrialSubset};
            });
        });

        ourSubsets[subsetSize] = Object.entries(ourWorst).sort((a, b) => b[1].p - a[1].p).map(worst => worst[0]);
        theirSubsets[subsetSize] = Object.entries(theirWorst).sort((a, b) => a[1].p - b[1].p).map(worst => worst[0]);
    }
    return [ourSubsets, theirSubsets];
}

export function simulateCombat(options, trials) {
    options.us.usedArena = options.them.usedArena = false;
    options.sea = ~options.us.army.indexOf('s') || ~options.them.army.indexOf('s');
    if (options.sea)
        options.fort = false;
    [options.us, options.them].forEach(function(player) {
        if (player.civ === C.BARBARIAN) {
            for (let i = 0; i < player.wonders.length; i++)
                player.wonders[i] = false;
            for (let i = 0; i < player.advances.length; i++)
                player.advances[i] = false;
            player.cards = [];
            ['food', 'wood', 'ore', 'gold', 'culture'].forEach(r => player.resources[r] = 0);
        }
    })

    // first, find the best subsets of each army for each player
    let [ourSubsets, theirSubsets] = findBestSubsets(options);

    let players = {};     // players is mutable.  Options are not.  So clone players.
    players.us = cloneDeep(options.us);
    players.them = cloneDeep(options.them);
    players.us.subsets = ourSubsets;
    players.them.subsets = theirSubsets;
    logGameState(players, 'found subsets', ourSubsets, theirSubsets);

    // then make them fight
    return getPwin(options, players, trials, 0, true).concat(players);

}
