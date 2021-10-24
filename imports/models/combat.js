import * as C from './components';


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
function resetResources(options) {
    ['food', 'wood', 'ore', 'gold', 'culture'].forEach(function(res) {
        if (options[res] < 0)
            options['need_'+res] = true;
        options[res] = options['starting_' + res];
    })
}
function haveResource(options, amt, type) {
    let have = options[type] + options['gold'];
    if (have < amt)
        options[type]--; // flag it for ui
    return have
}
function spendResource(options, amt, type) {
    options[type] = Math.max(0, options[type] - amt)
    amt -= options[type];
    options['gold'] -= amt;
}


// todo solar eclipse

function def(v,d) { return v !== undefined ? v : d; }
function randInt(max, min) { return Math.floor(Math.random() * def(max, 1)) + def(min, 0); }
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

function addCards(cards, cardType, seenCards) {
    for (let i = 0; i < C.CardCounts[cardType] - seenCards.count(cardType); i++)
        cards.push(cardType);
}
function getAllCards(seenCards) {
    let cards = [];    
    C.AllCards.forEach(function(c) { addCards(cards, c, seenCards);})
    return cards;
}
let UnseenCards = [];

// you tell ourArmy which cards you're playing in which order
// we'll work out which cards your opponents might have and randomly play for theirArmy
function getPlayableCardTypes(options, ourOptions) {
    let playable = [];
    if (!ourOptions.barbarians)
        return playable;
    
    if (!options.sea) {
        playable.push(C.ARCHERS);
        playable.push(C.PELTASTS);
        playable.push(C.ROUTING);
    }

    if (!ourOptions.attacking) {
        playable.push(C.DEFIANT);
        playable.push(C.PREPARED);
        // addCards(playable, C.RETREAT); no
    }

    if (!ourOptions.attacking && options.city) {
        playable.push(C.PEOPLE);
        playable.push(C.UPGRADED);
    }

    if (!ourOptions.attacking || !options.city)
        playable.push(C.GROUND);

    if (ourOptions.attacking) {
        playable.push(C.FLANKING);
        playable.push(C.WEDGE);
    }

    if (ourOptions.attacking && options.city)
        playable.push(C.SIEGE);

    playable = playable.concat([C.MORALE, C.MARTYR, C.SURPRISE, C.SCOUTS]);

    return playable;
}

function getPlayableCards(options, ourOptions, theirOptions) {
    let playable = [];
    if (!ourOptions.hasCards)
        return playable;

    let playableTypes = getPlayableCardTypes(options, ourOptions)
    playableTypes.forEach(function(t) { addCards(playable, t, theirOptions.cards) });
    return playable;
}


function preRollModifier(ourArmy, theirArmy, options, ourOptions, theirOptions, round) {

    let modifier = 0;
    if (ourOptions.attacking && ~theirOptions.wonders.indexOf(C.GREATWALL) && round === 0)
        modifier -= 2;

    if (ourOptions.steelWeapons) {
        let needOre = !~ourOptions.advances.indexOf(C.METALLURGY) || ~theirOptions.advances.indexOf(C.STEEL_WEAPONS)
        if (!needOre || haveResource(ourOptions, 1, 'ore')) {
            if (theirOptions.steelWeapons)
                modifier++;
            else
                modifier += 2;
            if (needOre)
                spendResource(ourOptions, 1, 'ore');
        }
    }

    if (ourOptions.fanaticism && round === 0)
        modifier += 2;
    
    if (~ourOptions.advances.indexOf(C.IMMORTALS)) {
        if (ourOptions.culture <= 0) ourOptions.culture--; // flag that we ran out

        let spend = min(4, ourOptions.culture)
        modifier += spend;
        ourOptions.culture -= spend;
    }
    
    if (options.sea && ~ourOptions.advances.indexOf(C.BIREMES)) {
        if (round === 0 || !~theirOptions.advances.indexOf(C.WARSHIPS))
            modifier += 2;
    }

    if (theirOptions.playedCard === C.DEFIANT)
        modifier -= ourArmy.length

    if (ourOptions.playedCard === C.MORALE)
        modifier += 2;

    if (ourOptions.playedCard === C.SURPRISE) {
        modifier += 1;
    }

    if (ourOptions.playedCard === C.SIEGE && !options.sea)
        modifier += 1;

    if (ourOptions.playedCard === C.WEDGE && !options.sea && ourOptions.attacking)
        modifier += theirArmy.length;

    modifier += ourOptions.celtsTribalWarfare;

    return modifier;
}

function postRollModifier(ourCVB, roll, ourArmy, theirArmy, options, ourOptions, theirOptions, round) {
    var bonusCap = 1000;
    if (~theirOptions.advances.indexOf(C.ELEPHANTS) && ~theirArmy.indexOf('e'))
        bonusCap = 2

    if (!ourOptions.attacking && ourOptions.fort && round === 0) {
        if (~theirOptions.advances.indexOf(C.SIEGECRAFT) && haveResource(theirOptions, 2, 'ore'))
            spendResource(theirOptions, 2, 'ore');
        else
            ourCVB['blocks']++;
    }

    if (!ourOptions.attacking && ~ourOptions.advances.indexOf(C.WARSHIPS) && round === 0)
        ourCVB['blocks']++;

    if (~ourOptions.advances.indexOf(C.FIREWORKS) && round === 0) {
        if (haveResource(ourOptions, 1, 'food') && haveResource(ourOptions, 1, 'ore')) {
            ourCVB['blocks'] += 1
            spendResource(ourOptions, 1, 'food');
            spendResource(ourOptions, 1, 'ore');
        }
    }


    if (ourOptions.playedCard === C.PELTASTS && !options.sea)
        for (let i = 0; i < ourArmy.length; i++)
            if (randInt(3) === 3)
                ourCVB['blocks']++; // todo this is only supposed to be "during remove casualties"

    if (ourOptions.playedCard === C.UPGRADED && !ourOptions.attacking && options.city)
        ourCVB['blocks']++;

    if (~ourOptions.wonders.indexOf(C.GREATARENA) && !ourOptions.usedArena && (ourCVB['cv'] + ourCVB['bonusCV']) % 5 === 4) {
        if (ourCVB['bonusCV'] < bonusCap ) {
            ourOptions.usedArena = true;
            ourCVB['bonusCV'] += 1;
        }
    }

    // finally, cap the bonus CV at 2 against Persian elephants
    if (bonusCap)
        ourCVB['bonusCV'] = Math.min(bonusCap, ourCVB['bonusCV']);

    // now calculate hits
    ourCVB['hits'] = Math.floor((ourCVB['cv'] + ourCVB['bonusCV']) / 5)
}

function clashAbilities(army, roll, bonusCV, options, ourOptions, theirOptions, round) {
    let eles = army.count('e');
    let cavs = army.count('c');
    let infs = army.count('i');
    let blocks = 0;
    let cv = 0;
    let canClash = true;
    if (theirOptions.playedCard === C.GROUND && !(theirOptions.attacking && options.city))
        canClash = false;
    if (theirOptions.playedCard === C.SIEGE && theirOptions.attacking && options.city) {
        if (haveResource(ourOptions, 2, 'food'))
            spendResource(ourOptions, 2, 'food');
        else
            canClash = false;
    }

    let oneFace = roll.indexof('1l')
    if (~army.indexOf('l') && ~oneFace && canClash)
        roll[oneFace] = C.Faces[randInt(11, 2)];
    
    let sorted = roll.sort(function(a, b) { return b[0] - a[0] }) // lower elephants go first
    sorted.forEach(function(r) {
        cv += r[0]

        if (canClash) {            
            if (eles && r[1] === 'e') {
                eles--;
                blocks++
                cv -= r[0]
            }
    
            if (cavs && r[1] === 'c') {
                cavs--;
                bonusCV += 2
                if (~ourOptions.advances.indexOf(C.HORSEMANSHIP) && round === 0 && !ourOptions.attacking && options.fort)
                    bonusCV++;
            }
    
            if (inf && r[1] === 'i') {
                infs--;
                bonusCV++
            }
        }
    });

    return {cv: cv, bonusCV: bonusCV, blocks:blocks};

}
function applyHits (army, hits, ourOptions) {
    if (hits <= 0)
        return army

    /*let bestCompositions = {}
    if (attacking)
        bestCompositions = { 
            1: ['e', 'c', 'l', 'i'],
            2: ['el', 'ce', 'cl', 'ie', 'ic', 'il', 'ee', 'cc', 'ii'],
            3: ['cel', 'iel', 'ice', 'icl', 'eel', 'cce', 'ccl', 'cee', 'iie', 'iic', 'iil', 'icc', 'iee', 'ccc', 'eee', 'iii'],
        }
    else
        bestCompositions = {
            1: ['e', 'c', 'l', 'i'],
            2: ['el', 'cl', 'ce', 'ic', 'il', 'ie', 'cc', 'ee', 'ii'],
            3: ['cel', 'icl', 'iel', 'ccl', 'ice', 'eel', 'cce', 'iil', 'icc', 'iic', 'cee', 'iie', 'ccc', 'iee', 'iii', 'eee']
        }*/

    let alive = army.length - hits;
    if (alive <= 0)
        return ''

    // find the best (first) subset that the original army had
    for (let i = 0; i < ourOptions.subsets[alive].length; i++)
        if (['l','i','c','e'].every(t => bestCompositions[i].count(t) <= army.count(t) ))
            return bestCompositions[i]
}

function preRollCards(ourArmy, options, ourOptions, theirOptions, round) {
    if (ourOptions.playedCard === C.SCOUTS) {
        if (thierOptions.playedCard in getPlayableCardTypes(options, ourOptions))
            ourOptions.cards.push(theirOptions.playedCard)
        theirOptions.playedCard = -1;
    }

    if (ourOptions.playedCard === C.MARTYR || theirOption.playedCard === C.MARTYR)
        ourArmy = applyHits(ourArmy, 1, ourOptions);
    
    if (theirOptions.playedCard === C.MARTYR)
        ourOptions.playedCard = -1; // todo some effects benefit from this

    if (theirOptions.playedCard === C.ARCHERS && !options.sea && randInt(3) === 3)
        ourArmy = applyHits(ourArmy, 1, ourOptions);

    return ourArmy;
}

function postCasualties(ourArmy, theirArmy, ourCVB, theirCVB, options, ourOptions, theirOptions, round) {
    let ourKills = Math.min(ourCVB['hits'] - theirCVB['blocks'], theirArmy.length);
    let theirKills = Math.min(theirCVB['hits'] - ourCVB['blocks'], ourArmy.length);

    if (theirOptions.playedCard === C.ROUTING && !options.sea) {
        if (ourKills <= theirKills && randInt(3) === 3)
            ourArmy = applyHits(ourArmy, 1, ourOptions); // cannot be canceled
    }

    if (ourOptions.playedCard === C.SURPRISE && ourKills > 0) {
        let card = UnseenCards.pop();
        if (card in getPlayableCardTypes(options, ourOptions))
            ourOptions.cards.push(card);
    }

    return ourArmy;
}

export function roll (army, ourOptions, theirOptions, round) {
    let roll = [];

    var extraRolls = 0;
    if (round === 0 && !ourOptions.attacking && ourOptions.fort ) {
        if (~theirOptions.advances[C.SIEGECRAFT] && countResource(theirOptions, 'wood'))
            spendResource(theirOptions, 2, 'wood');
        else
            extraRolls++;
    }
    if (ourOptions.playedCard === 'For the People' && options.city && !ourOptions.attacking)
        extraRolls++;
    if (ourOptions.playedCard === 'Flanking' && ourOptions.attacking)
        extraRolls++;
    if (ourOptions.playedCard === 'Prepared Defenses' && !ourOptions.attacking)
        extraRolls++;

    for (let i = 0; i < army.length + extraRolls; i++) {
        let r = randInt(11, 0);
        roll.push(Faces[r]);
    }

    return roll
}


// # Units can be ship, inf, cav, ele, leader, or can be ? which means the sim tries all possibilities to give you best choice.
export function battle (ourArmy, theirArmy, options, startingRound=0) {
    let fightOver = false;
    let round = startingRound;
    let playableCards = getPlayableCards(options, theirOptions, ourOptions)
    playableCards = shuffle(playableCards);
    UnseenCards = getAllCards(ourOptions.cards);
    UnseenCards = shuffle(UnseenCards);
    [options.us, options.them].forEach(function(opt) {resetResources(opt)})

    while (!fightOver) {
        let p = 0;
        for (p = 0; p < playableCards.length; p++) {
            let u = UnseenCards.indexOf(playableCards[p]);
            if (~u) {
                UnseenCards.splice(u, 1);
                playableCards.splice(p, 1);
                options.them.playedCard = playableCards[p];
                break;
            }
        }
        // play our next card if possible
        if (options.us.cards.length && ourArmy.length < 5 && !(~options.them.advances.indexOf(C.SPARTANS) && ourArmy.length > theirArmy.length))
            options.us.playedCard = option.us.cards.shift();
        else
            options.us.playedCard = -1;

        ourArmy = preRollCards(ourArmy, options, options.us, options.them, round);
        theirArmy = preRollCards(theirArmy, options, options.them, options.us, round);
        if (ourArmy === '' || theirArmy === '')
            break;

        let attackerModifier = preRollModifier(ourArmy, theirArmy, options, options.us, options.them, round)
        let defenderModifier = preRollModifier(theirArmy, ourArmy, options, options.them, options.us, round)

        let ourRoll = this['combat.roll'](ourArmy, options, options.us, options.them, round);
        let theirRoll = roll(theirArmy, options, options.them, options.us, round)

        let ourCVB = clashAbilities(ourArmy, ourRoll, attackerModifier, options.us, options.them);
        let theirCVB = clashAbilities(theirArmy, theirRoll, defenderModifier, options.them, options.us);

        postRollModifier(attackerCVB, attackerRoll, ourArmy, theirArmy, options, options.us, options.them, round)
        postRollModifier(defenderCVB, defenderRoll, theirArmy, ourArmy, options, options.them, options.us, round)

        ourArmy = applyHits(ourArmy, theirCVB['hits'] - ourCVB['blocks'], options.us)
        theirArmy = applyHits(theirArmy, ourCVB['hits'] - theirCVB['blocks'], options.them)

        ourArmy = postCasualties(ourArmy, theirArmy, ourCVB, theirCVB, options, options.us, options.them)
        theirArmy = postCasualties(theirArmy, ourArmy, theirCVB, ourCVB, options, options.them, options.us)

        fightOver = ourArmy.length === 0 || theirArmy.length === 0 || options.eclipse;
        round++;


    }
    return ourArmy.length - theirArmy.length;
}

function getArmies(armySize) {
    if (armySize === 1)
        return ['s', 'sl', 'l', 'i', 'c', 'e'];
    else if (armySize === 2)
        return ['ss', 'ssl', 'il', 'cl', 'el', 'ii', 'ic', 'ie', 'cc', 'ce', 'ee'];
    else if (armySize === 3)
        return ['sss', 'sssl', 'iil', 'icl', 'iel', 'ccl', 'cel', 'eel', 'iii', 'iic', 'iie', 'icc', 'ice', 'iee', 'ccc', 'cce', 'cee', 'eee'];
    else if (armySize === 4)
        return ['ssss', 'ssssl', 'iiii', 'iiic', 'iiie', 'iicc', 'iice', 'iiee', 'iccc', 'icce', 'icee', 'ieee', 'cccc', 'ccce', 'ccee',
            'ceee', 'eeee', 'liii', 'liic', 'liie', 'licc', 'lice', 'liee', 'lccc', 'lcce', 'lcee', 'leee'];
}

export function getPwin(ourArmy, theirArmy, options, trials, startingRound) {
    let survivors = []
    for (let i = 0; i < trials; i++)
        survivors.push(battle(ourArmy, theirArmy, options, startingRound))

    // calculate avg win %
    let weWin = 0;
    survivors.forEach(function(x) {if (options.us.attacking && x > 0 || x > 1) weWin++;})
    let pWin = weWin / trials;

    // avg survivors
    let totalSurvivors = 0;
    survivors.forEach(function(s) {totalSurvivors += s})
    let avgSurvivors = totalSurvivors / trials;

    return [pWin, avgSurvivors];
}

function findBestSubsets(ourArmy, theirArmy, options) {
    options.us.subsets = {}
    options.them.subsets = {}
    for (let subsetSize = 1; subsetSize < Math.max(ourArmy.length, theirArmy.length); subsetSize++) {
        const armies = getArmies(subsetSize);

        // find all subsets of each army
        let ourSubsets = ourArmy.length > subsetSize && armies.filter(a => ['s','l','i','c','e'].every(t => a.count(t) <= ourArmy.count(t)))
            || [ourArmy];
        if (options.us.saveLeader && ~ourArmy.indexOf('l')) // if we opt to save the leader, filter out subsets without him
            ourSubsets = ourSubsets.filter(s => ~s.indexOf('l'))
        let theirSubsets = theirArmy.length > subsetSize && armies.filter(a => ['s','l','i','c','e'].every(t => a.count(t) <= theirArmy.count(t)))
            || [theirArmy];
        if (options.them.saveLeader && ~theirArmy.indexOf('l')) theirSubsets = theirSubsets.filter(s => ~s.indexOf('l'))

        // make each subset fight each other subset
        let ourWorst = {};
        let theirWorst = {};
        ourSubsets.forEach(function(us) {
            theirSubsets.forEach(function(them) {
                [pWin, _] = getPwin(ourArmy, theirArmy, options, 1000, 2);

                if (!(us in ourWorst) || ourWorst[us]['p'] > pWin)
                    ourWorst[us] = {p: pWin, opponent: theirArmy};
                if (!(them in theirWorst) || theirWorst[them]['p'] < pWin)
                    theirWorst[them] = {p: pWin, opponent: ourArmy};
            });
        });

        options.us.subsets[subsetSize] = ourWorst.entries().sort(function(a, b) {return (a[1].p < b[1].p)}).map(worst => worst[0]);
        options.them.subsets[subsetSize] = theirWorst.entries().sort(function(a, b) {return a[1].p > b[1].p}).map(worst => worst[0]);

    }
}

export function simulateCombat(ourArmy, theirArmy, options, trials) {
    // first, find the best subsets of each army
    findBestSubsets(ourArmy, theirArmy, options);

    return getPwin(ourArmy, theirArmy, optoins, trials)

}
