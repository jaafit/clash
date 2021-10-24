import React, { useState } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import _ from 'lodash';
//import { Task } from './Task';
//import { Tasks } from '/imports/api/tasks';

const toggleChecked = ({ _id, isChecked }) => {
  Meteor.call('tasks.setChecked', _id, !isChecked);
};

const togglePrivate = ({ _id, isPrivate }) => {
  Meteor.call('tasks.setPrivate', _id, !isPrivate);
};

battleOptions = {
    city: false,
    sea: false,
    fort: false,
}
playerOptions = {
    greatArena: false,
    greatWall: false,
    warships: false,
    steelWeapons: false,
    metalurgy: false,
    chinaFireworks: false,
    celtsTribalWarfare: 0,
    greeceSpartans: false,
    japanHorsemanship: false,
    persiaElephants: false,
    persiaImmortals: false,
    food: 0,
    wood: 0,
    ore: 0,
    gold: 0,
    culture: 0,
    mood: 0,


}

const deleteTask = ({ _id }) => Meteor.call('tasks.remove', _id);

export const App = () => {
  const filter = {};

  const [fortress, setFortress] = useState(false);

  /*if (hideCompleted) {
    _.set(filter, 'checked', false);
  }*/



  return (
    <div className="simple-todos-react">
      <h1>Clash of Cultures Combat Simulator</h1>

      <div className="filters">
        <label>
          <input
              type="checkbox"
              readOnly
              checked={ Boolean(fortress) }
              onClick={() => setFortress(!fortress)}
          />
          Fortress
        </label>
      </div>

        <div>
            Fortress = {fortress ? 'yes':'no'}
        </div>

        {/*<ul className="tasks">
        { tasks.map(task => <Task
          key={ task._id }
          task={ task }
          onCheckboxClick={toggleChecked}
          onDeleteClick={deleteTask}
          onTogglePrivateClick={togglePrivate}
        />) }
      </ul>*/}

    </div>
  );
};
