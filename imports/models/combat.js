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
function haveResource(player, amt, type) {
    let have = player.resources[type];
    if (~['food', 'wood', 'ore'].indexOf(type))
        have += player.resources['gold'];
    if (have < amt)
        player[type]--; // flag it for ui
    return have >= amt
}
function spendResource(player, amt, type) {
    if (!haveResource(player, amt, type))
        return false;    
    player[type] = Math.max(0, player[type] - amt)
    amt -= player[type];
    if (~['food', 'wood', 'ore'].indexOf(type))
        player['gold'] -= amt;
    return true;
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

function leaderInArmy(options, us, leader) {
    return us.leader === leader && !options.sea && ~us.army.indexOf('l');
}

// you tell ourArmy which cards you're playing in which order
// we'll work out which cards your opponents might have and randomly play for theirArmy
export function getPlayableCardTypes(options, us) {
    let playable = [];
    if (us.civ === C.BARBARIAN)
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
    playable = playable.filter(function(c) {
        return C.Cards[c].army && !options.sea
            || C.Cards[c].ship && options.sea
            || C.Cards[c].fort && options.fort;
    })

    return playable;
}
function dealCards(us, startingRound) {
    for (let i = 0; i < us.cards.length; i++)
        if (us.cards[i] === C.UNKNOWNCARD)
            us.cards[i] = UnseenCards.shift();
    us.cards = us.cards.slice(startingRound); //  skip cards if round starts later
}

function preRoundEffects(options, us, them, round) {

    if (leaderInArmy(options, us, C.VIRIATUS) && round > 0 && spendResource(us, 2, 'mood'))
        applyHits(them, 1, false); // force enemy unit from battle todo don't kill him

    if (leaderInArmy(options, us, C.CLEOPATRA) && round === 0) {
        if (!spendResource(them, us.abilityValue, 'culture'))
            applyHits(them, 10); // todo less deathy
    }

    if (leaderInArmy(options, us, C.AKBAR) && ~us.army.indexOf('e') && round === 0 && spendResource(us, 1, 'ore'))
        us.akbarPaid = true; // todo the elephants won't be considered in subsets

    if (leaderInArmy(options, us, C.GOTOBA) && round === 0 && spendResource(us,1, 'ore'))
        us.gotobaPaid = true;

}

function playCard(playableCards, options, us, them, round) {
    // play our next card if possible
    us.playedCard = undefined;
    let canPlayCard = true;

    if (them.advances[C.SPARTANS] && us.army.length > them.army.length)
        canPlayCard = false;

    if (leaderInArmy(options, them, C.BLEDA) && options.city && them.attacking && round === 0)
        canPlayCard = false;
    
    if (leaderInArmy(options, us, C.XERXES) && us.army.length === 5)
        canPlayCard = false;

    if (canPlayCard)
        while (us.cards.length) {
            let c = us.cards.shift();
            
            if (~playableCards.indexOf(c) || leaderInArmy(options, us, C.CYRUS)) {
                us.playedCard = c;
                break;
            }             
        }
}

function preRollCards(playableCards, options, us, them, round) {
    
    if (us.playedCard === C.SCOUTS) {
        us.cards.push(them.playedCard);
        
        if (leaderInArmy(options, them, C.CYRUS) && them.playedCard)
            them.cvb.bonusCV += 2;
        them.playedCard = undefined;
    }

    if (us.playedCard === C.MARTYR || them.playedCard === C.MARTYR)
        applyHits(us, 1);

    if (us.playedCard === C.MARTYR) {
        if (leaderInArmy(options, them, C.CYRUS) && them.playedCard)
            them.cvb.bonusCV += 2;
        them.playedCard = undefined;
    }

    if (us.playedCard === C.ARCHERS && !options.sea && randInt(1,3) === 3)
        applyHits(them, 1);

    // did CYRUS play an unplayable card?
    if (leaderInArmy(options, us, C.CYRUS) && !~playableCards.indexOf(us.playedCard)) {
        us.cvb.bonusCV += 2;
        us.playedCard = undefined; // no future code needs to steal our card, so null it now
    }


}


function preRollEffects(options, us, them, round) {
    
    if (!us.attacking && options.fort && round === 0) {
        if (!them.advances[C.SIEGECRAFT] || !spendResource(them, 2, 'ore'))
            us.cvb.blocks++;
    }

    if (us.attacking && them.wonders[C.GREATWALL] && round === 0)
        us.cvb.bonusCV -= 2;

    if (us.advances[C.STEEL_WEAPONS]) {
        let needOre = !us.advances[C.METALLURGY] || them.advances[C.STEEL_WEAPONS]
        if (!needOre || spendResource(us, 1, 'ore')) {
            if (them.advances[C.STEEL_WEAPONS])
                us.cvb.bonusCV++;
            else
                us.cvb.bonusCV += 2;
        }
    }

    if (us.advances[C.FANATICISM] && round === 0)
        us.cvb.bonusCV += 2;

    if (us.advances[C.IMMORTALS] && haveResource(us, 1, 'culture')) {
        let spend = Math.min(4, us.resources.culture)
        us.cvb.bonusCV += spend;
        spendResource(us, spend, 'culture');
    }

    if (options.sea && us.advances[C.BIREMES]) {
        if (round === 0 || !them.advances[C.WARSHIPS])
            us.cvb.bonusCV += 2;
    }

    if (us.advances[C.WARSHIPS] && round === 0)
        if (options.sea || us.attacking && options.amphibious)
            us.cvb.blocks++;

    if (us.playedCard === C.PELTASTS && !options.sea)
        for (let i = 0; i < us.army.length; i++)
            if (randInt(1,3) === 3)
                us.cvb.blocks++; // todo this is only supposed to be "during remove casualties"

    if (them.playedCard === C.DEFIANT && us.attacking)
        us.cvb.bonusCV -= them.army.length

    if (us.playedCard === C.MORALE)
        us.cvb.bonusCV += 2;

    if (us.playedCard === C.UPGRADED && !us.attacking && options.city)
        us.cvb.blocks++;

    if (us.playedCard === C.SURPRISE)
        us.cvb.bonusCV += 1;

    if (us.playedCard === C.SIEGE && !options.sea)
        us.cvb.bonusCV += 1;

    if (us.playedCard === C.WEDGE && !options.sea && us.attacking)
        us.cvb.bonusCV += them.army.length;

    if (us.advances[C.TRIBAL_WARFARE] && them.civ !== C.BARBARIAN && !options.sea)
        us.cvb.bonusCV += Math.min(4, us.advances[C.TRIBAL_WARFARE]);

    if (leaderInArmy(options, us, C.AHUITZOTL) && us.abilityValue)
        us.cvb.blocks++;

    if (leaderInArmy(options, us, C.NEBUCHADNEZZAR) && options.city && us.attacking && us.abilityValue)
        us.cvb.bonusCV += 2;

    if (leaderInArmy(options, us, C.NABOPOLASSAR) && us.abilityValue)
        us.cvb.bonusCV += 2;

    if (us.leader === C.HANNO && options.sea)
        us.cvb.bonusCV += 2;

    if (leaderInArmy(options, us, C.DIDO) && !us.attacking && options.city)
        us.cvb.bonusCV += 2;

    if (leaderInArmy(options, us, C.VERCINGETORIX))
        us.cvb.bonusCV += us.abilityValue;

    if (leaderInArmy(options, us, C.BOUDICA) && us.abilityValue)
        us.cvb.bonusCV += 2;

    if (leaderInArmy(options, us, C.RAMSES) && options.city && us.attacking && us.abilityValue)
        us.cvb.bonusCV += 2;
    if (us.leader === C.RAMSES && options.sea && them.civ === C.PIRATE)
        us.cvb.bonusCV += 2;

    if (us.leader === C.PERICLES && options.sea)
        us.cvb.bonusCV += 2;

    if (leaderInArmy(options, us, C.ALEXANDER))
        us.cvb.bonusCV += us.abilityValue;

    // "just before the combat roll"
    if (leaderInArmy(options, us, C.LEONIDAS))
        us.cvb.bonusCV += 2 * Math.max(them.army.length - us.army.length, 0);

    if (leaderInArmy(options, us, C.WU) && us.army.length >= them.army.length)
        us.cvb.bonusCV += 2;
    
    if (us.akbarPaid)
        us.cvb.bonusCV += us.army.count('e');
    
    if (leaderInArmy(options, us, C.MAHARAJA) && !this.playedCard === undefined)
        us.cvb.bonusCV += 2;
    
    if (us.leader === C.JIMMU && options.city && options.fort && !us.attacking && this.abilityValue && !us.leaderDied)
        us.cvb.bonusCV += 2
    
    if (us.gotobaPaid)
        us.cvb.bonusCV += 2;
    
    if (!us.attacking && leaderInArmy(options, us, C.SUIKO))
        us.cvb.bonusCV += 2;
    
    if (us.attacking && options.city && round === 0 && leaderInArmy(options, us, C.SIYAJ))
        us.cvb.bonusCV += us.abilityValue;
    
    if (us.abilityValue && leaderInArmy(options, us, C.WAK))
        us.cvb.bonusCV += 2;
    
    if (us.abilityValue && leaderInArmy(options, us, C.ITHOBAAL))
        us.cvb.bonusCV += 2;

    if (us.abilityValue && leaderInArmy(options, us, C.AUGUSTUS))
        us.cvb.bonusCV += 2;

    if (them.civ === C.BARBARIAN && leaderInArmy(options, us, C.SULLA))
        us.cvb.bonusCV += 2;

    if (options.amphibious && leaderInArmy(options, us, C.RAGNAR))
        us.cvb.bonusCV += 2;
}

export function roll (options, us, them, round) {
    us.roll = [];

    let extraRolls = 0;
    if (round === 0 && !us.attacking && options.fort ) {
        if (!them.advances[C.SIEGECRAFT] || !spendResource(them,2, 'wood'))
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
        us.roll.push(C.Faces[r]);
    }

}

function clashAbilities(options, us, them, round) {
    let eles = us.army.count('e');
    let cavs = us.army.count('c');
    let infs = us.army.count('i');
    let canClash = true;
    if (them.playedCard === C.GROUND && !(them.attacking && options.city))
        canClash = false;
    if (them.playedCard === C.SIEGE && them.attacking && options.city) {
        if (!spendResource(us, 2, 'food'))
            canClash = false;
    }

    let oneFace = us.roll.indexOf('1l')
    let ri = randInt(2,11);
    if (~us.army.indexOf('l') && ~oneFace && canClash) {
        us.roll[oneFace] = C.Faces[ri];
        if (!us.roll[oneFace])
            debugger;
    }

    us.roll.sort(function(a, b) { return Number(a[0]) - Number(b[0]) });
    us.roll.forEach(function(r) { // lower elephants go first
        us.cvb.cv += Number(r[0]);

        if (canClash) {            
            if (eles && r[1] === 'e') {
                eles--;
                us.cvb.blocks++
                us.cvb.cv -= Number(r[0]);
            }
    
            if (cavs && r[1] === 'c') {
                cavs--;
                us.cvb.bonusCV += 2

                us.usedHorsemanship = us.usedHorsemanship || false;
                if (us.advances[C.HORSEMANSHIP] && round === 0 && !us.attacking && options.fort && !us.usedHorsemanship) {
                    us.cvb.bonusCV++;
                    us.usedHorsemanship = true;
                }
            }
    
            if (infs && r[1] === 'i') {
                infs--;
                us.cvb.bonusCV++
            }
        }
    });


}

function postRollBonus(options, us, them, round) {
    let bonusCap = undefined;
    if (them.advances[C.ELEPHANTS] && ~them.army.indexOf('e') && round === 0)
        bonusCap = 2;

    if (round === 0 && leaderInArmy(options, them, C.HANNIBAL))
        bonusCap = 2;

    if (!options.sea && us.wonders[C.GREATARENA] && us.cvb['bonusCV'] < bonusCap
        && !us.usedArena && (us.cvb['cv'] + us.cvb['bonusCV']) % 5 === 4 && spendResource(us, 1, 'culture')) {
        us.usedArena = true;
        us.cvb.bonusCV += 1;
    }

    // finally, cap the bonus CV
    if (bonusCap !== undefined)
        us.cvb.bonusCV = Math.min(bonusCap, us.cvb.bonusCV);

    // now calculate hits
    us.cvb.hits = Math.floor((us.cvb.cv + us.cvb.bonusCV) / 5)
}

function postRollBlocks(options, us, them, round) {

    if (round === 0 && leaderInArmy(options, us, C.ATTILA) && ~us.army.indexOf('c') && us.roll.some(r => r[1] === 'c')) {
        // 1 cav may use ele clash instead of cav clash.  Do we want to?
        let ourCount = us.army.length - Math.max(them.cvb.hits - us.cvb.blocks, 0);
        let theirCount = them.army.length - Math.max(us.cvb.hits - them.cvb.blocks, 0);
        let blockMatters = us.cvb.blocks < them.cvb.hits && ourCount >= 0;
        let cvToLose = 0;
        for (let i = 0; i < us.roll.length; i++) {
            if (us.roll[i][1] === 'c') {
                cvToLose = Number(us.roll[i][0]) + 2;
                break;
            }
        }
        let swap = false;
        let hitsBefore = Math.max(us.cvb.hits - them.cvb.blocks, 0);
        let hitsAfter = Math.max(Math.floor((us.cvb.cv + us.cvb.bonusCV - cvToLose) / 5) - them.cvb.blocks, 0);
        let hitsToLose = hitsBefore - hitsAfter;
        if (hitsToLose === 0)
            swap = true;
        else if (hitsToLose === 2 && theirCount <= -2 // save our unit at no cost
            || hitsToLose === 1 && theirCount <= -1) // save our unit at no cost
            swap = true;
        else if (us.attacking && blockMatters &&
            ( ourCount === 0 // one last breath!
            || hitsToLose === 1 && ourCount - theirCount <= 0 && ourCount >= 1)) // 3v3 better than 2v2))
            swap = true;
        else if (!us.attacking && blockMatters &&
            (ourCount === 0 && theirCount > 0
                || hitsToLose === 1 && ourCount > 0 && ourCount < theirCount))
            swap = true;
        if (swap) {
            us.cvb.bonusCV -= 2;
            us.cvb.cv -= cvToLose - 2;
            us.cvb.blocks++;
            us.cvb.hits -= hitsToLose;
        }
    }

    // When removing casualties \/ \/ \/

    if (us.advances[C.FIREWORKS] && round === 0 && them.cvb.hits > us.cvb.blocks) {
        if (haveResource(us, 1, 'food') && haveResource(us, 1, 'ore')) {
            us.cvb.blocks++;
            spendResource(us, 1, 'food');
            spendResource(us, 1, 'ore');
        }
    }

    if (them.cvb.hits > us.cvb.blocks && leaderInArmy(options, us, C.QIN) && spendResource(us, 2, 'culture'))
        us.cvb.blocks++;
    
    if (!us.attacking && options.city && us.abilityValue && round === 0 && them.cvb.hits > us.cvb.blocks && leaderInArmy(options, us, C.KINICH))
        us.cvb.blocks++;
    
    if (!us.pygmalionPaid && !us.attacking && options.city && them.cvb.hits > us.cvb.blocks && leaderInArmy(options, us, C.PYGMALION)
    && spendResource(us, 1, 'culture')) {
        us.pygmalionPaid = true;
        us.cvb.blocks++;
    }
}

function applyHits (player, hits, bestSubset=true) {
    if (hits <= 0)
        return;

    let alive = player.army.length - hits;
    if (alive <= 0) {
        player.army = '';
        return
    }

    // find the best (first) subset that the original army had
    const bestCompositions = player.subsets[alive].slice();
    if (!bestSubset)
        bestCompositions.reverse(); // or worst

    for (let i = 0; i < bestCompositions.length; i++)
        if (C.UnitTypes.every(t => bestCompositions[i].count(t) <= player.army.count(t) )) {
            /*C.UnitTypes.forEach(function(t) {
                const died = player.army.count(t) - bestCompositions[i].count(t);
                for (let n = 0; n < died; n++)
                    player.dead += t;
            });*/
            if (~player.army.indexOf('l') && !~bestCompositions[i].indexOf('l'))
                player.leaderDied = true;
            player.army = bestCompositions[i];
            return;
        }
}

function postCasualtiesEffects(options, us, them, round) {
    let ourKills = Math.min(us.cvb['hits'] - them.cvb['blocks'], them.army.length);
    let theirKills = Math.min(them.cvb['hits'] - us.cvb['blocks'], us.army.length);

    if (us.playedCard === C.ROUTING && !options.sea) {
        if (ourKills >= theirKills && randInt(1,3) === 3)
            applyHits(them, 1); // cannot be canceled
    }

    if (us.playedCard === C.SURPRISE && ourKills > 0)
        us.cards.push(UnseenCards.shift());

    if (leaderInArmy(options, us, C.DIDO) && !us.attacking && options.city && us.abilityValue)
        applyHits(them, 10); // todo maybe just flag this another way
}


export function battle (options, players, startingRound=0, debug=false) {
    function fightOver() {
        return players.us.army.length === 0 || players.them.army.length === 0 || options.eclipse && round > 0;
    }
    let round = startingRound;
    let ourPlayableCardTypes = getPlayableCardTypes(options, players.us);
    let theirPlayableCardTypes = getPlayableCardTypes(options, players.them);
    UnseenCards = getAllCards(players.us.cards.concat(players.them.cards));
    UnseenCards = shuffle(UnseenCards);
    dealCards(players.us, startingRound);
    dealCards(players.them, startingRound);

    while (!fightOver()) {
        players.us.cvb = {cv:0, bonusCV:0, blocks:0, hits:0};
        players.them.cvb = {cv:0, bonusCV:0, blocks:0, hit:0};
        
        preRoundEffects(options, players.us, players.them, round);
        preRoundEffects(options, players.them, players.us, round);
        if (fightOver())
            break;

        playCard(ourPlayableCardTypes, options, players.us, players.them, round);
        playCard(theirPlayableCardTypes, options, players.them, players.us, round);
        if (debug) logGameState(players, 'played cards', C.Cards[players.us.playedCard], C.Cards[players.them.playedCard]);

        preRollCards(ourPlayableCardTypes, options, players.us, players.them, round);
        preRollCards(theirPlayableCardTypes, options, players.them, players.us, round);
        if (debug) logGameState(players, 'applied pre roll cards');
        if (fightOver())
            break;

        preRollEffects(options, players.us, players.them, round)
        preRollEffects(options, players.them, players.us, round)
        if (debug) logGameState(players, 'applied pre roll effects', players.us.cvb, players.them.cvb);
        if (fightOver()) // Viriatus
            break;

        roll(options, players.us, players.them, round);
        roll(options, players.them, players.us, round)
        if (debug) logGameState(players, 'rolled', players.us.roll, players.them.roll);

        clashAbilities(options, players.us, players.them, round);
        clashAbilities(options, players.them, players.us, round);
        if (debug) logGameState(players, 'applied clash abilities', players.us.roll, players.them.roll, players.us.cvb, players.them.cvb);

        postRollBonus(options, players.us, players.them, round)
        postRollBonus(options, players.them, players.us, round)
        postRollBlocks(options, players.us, players.them, round);
        postRollBlocks(options, players.them, players.us, round);
        if (debug) logGameState(players, 'applied post roll effects', players.us.cvb, players.them.cvb)

        applyHits(players.us, players.them.cvb['hits'] - players.us.cvb['blocks'])
        applyHits(players.them, players.us.cvb['hits'] - players.them.cvb['blocks'])
        if (debug) logGameState(players, 'applied hits');

        postCasualtiesEffects(options, players.us, players.them);
        postCasualtiesEffects(options, players.them, players.us);
        if (debug) logGameState(players, 'applied post casualties effects');

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
    options.sea = ~options.us.army.indexOf('s') && ~options.them.army.indexOf('s');
    if (options.sea)
        options.fort = false;
    [options.us, options.them].forEach(function(player) {
        if (player.civ === C.BARBARIAN) {
            for (let i = 0; i < player.wonders.length; i++)
                player.wonders[i] = false;
            for (let i = 0; i < player.advances.length; i++)
                player.advances[i] = false;
            player.leader = C.NOLEADER;
            player.cards = [];
            ['food', 'wood', 'ore', 'gold', 'culture', 'mood'].forEach(r => player.resources[r] = 0);
        }
        if (!options.sea && !~player.army.indexOf('l'))
            player.leader = C.NOLEADER;
        if (options.sea && player.leader && C.Leaders[player.leader].naval === false)
            player.leader = C.NOLEADER;
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
