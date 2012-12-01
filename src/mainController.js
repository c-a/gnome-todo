/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson
 *
 * Gnome Todo is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome Documents is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 */

const Lang = imports.lang;

const Config = imports.config;
const Global = imports.global;
const TaskListsModel = imports.taskListsModel;

function MainController(mainWindow)
{
    this._init(mainWindow);
}

MainController.prototype = {
    _init: function(mainWindow) {
        this.window = mainWindow;

        this._mainView = this.window.contentView.mainView;
        this._taskListsModel = new TaskListsModel.TaskListsModel();
        this._mainView.set_model(this._taskListsModel);

        for (let sourceID in Global.sourceManager.sources) {
            this._sourceAdded(null, Global.sourceManager.sources[sourceID]);
        }
        Global.sourceManager.connect('source-added',
            Lang.bind(this, this._sourceAdded));
        Global.sourceManager.connect('source-removed',
            Lang.bind(this, this._sourceRemoved));

        this.window.toolbar.connect('selection-mode-toggled',
            Lang.bind(this, this._selectionModeToggled));
    },

    _sourceAdded: function(manager, source) {
        source.listTaskLists(Lang.bind(this, function(error, taskLists) {
            /*TODO: show error */
            if (error)
                return;

            for (let i = 0; i < taskLists.length; i++)
            {
                let list = taskLists[i];

                this._taskListsModel.add(list.name, list.items, source.id);
            }
        }));
    },

    _sourceRemoved: function(manager, source) {
        let model = this._taskListsModel;
        model.removeByID(source.id);
    },

    _selectionModeToggled: function(toolbar, active) {
        this._mainView.set_selection_mode(active);
    }
}
