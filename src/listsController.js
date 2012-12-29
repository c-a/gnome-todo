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

const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const Config = imports.config;
const Global = imports.global;
const ListsView = imports.listsView;
const Selection = imports.selection;
const TaskListsModel = imports.taskListsModel;

function ListsController(mainWindow)
{
    this._init(mainWindow);
}

ListsController.prototype = {
    _init: function(mainWindow) {
        this.window = mainWindow;

        this._listsView = new ListsView.ListsView(this.window.contentView);

        this._taskListsModel = new TaskListsModel.TaskListsModel();
        this._listsView.mainView.set_model(this._taskListsModel);

        // Create SelectionController handling selections
        this._selectionController = new Selection.SelectionController(this, this._listsView);

        this._updateContentView();

        this.window.toolbar.connect('selection-mode-toggled',
            Lang.bind(this, this._selectionModeToggled));
        this.window.toolbar.connect('new-button-clicked',
            Lang.bind(this, this._newButtonClicked));
    },

    activate: function() {
        Global.sourceManager.connect('source-added',
            Lang.bind(this, this._sourceAdded));
        Global.sourceManager.connect('source-removed',
            Lang.bind(this, this._sourceRemoved));

        this.window.contentView.setView(this._listsView);

        this._refresh();
    },

    deactivate: function() {
    },

    _refresh: function() {
        this._outstandingLoads = 0;
        for (let sourceID in Global.sourceManager.sources) {
            this._sourceAdded(null, Global.sourceManager.sources[sourceID]);
        }
    },

    _sourceAdded: function(manager, source) {

        if (this._outstandingLoads++ == 0)
            this._listsView.showMainView(true);

        source.listTaskLists(Lang.bind(this, function(error, taskLists) {
            if (error) {
                let notification = new Gtk.Label({ label: error.message });
                Global.notificationManager.addNotification(notification);
            }
            else {
                for (let i = 0; i < taskLists.length; i++)
                {
                    let list = taskLists[i];
                    this._taskListsModel.add(list);
                }
            }

            this._outstandingLoads--;
            this._updateContentView();
        }));
    },

    _sourceRemoved: function(manager, source) {
        let model = this._taskListsModel;
        model.removeBySourceID(source.id);
        this._updateContentView();
    },

    _selectionModeToggled: function(toolbar, active) {
        this._selectionController.setActive(active);
    },

    _updateContentView: function() {
        if (this._outstandingLoads != 0)
            return;

        if (Global.sourceManager.nSources == 0) {
            this.window.toolbar.setNewButtonSensitive(false);
            this._listsView.showNoResults(true);
        }
        else {
            this.window.toolbar.setNewButtonSensitive(true);

            if (this._taskListsModel.nItems() == 0)
                this._listsView.showNoResults(false);
            else
                this._listsView.showMainView(false);
        }
    },

    _newButtonClicked: function() {

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/new_list_dialog.glade');

        let dialog = builder.get_object('new_list_dialog');
        dialog.set_transient_for(this.window);

        dialog.connect('response',
            Lang.bind(this, function(dialog, response_id) {

                if (response_id == Gtk.ResponseType.ACCEPT)
                {
                    let source;
                    for (let sourceID in Global.sourceManager.sources) {
                        source = Global.sourceManager.sources[sourceID];
                        break;
                    }

                    let entry = builder.get_object('entry');
                    source.createTaskList(entry.text,
                        Lang.bind(this, function(error, list) {
                            if (error) {
                                let notification = new Gtk.Label({ label: error.message });
                                Global.notificationManager.addNotification(notification);
                            }
                            else
                                this._taskListsModel.add(list);
                        }));
                }

                dialog.destroy();
            }));

        let entry = builder.get_object('entry');
        entry.connect('changed',
            Lang.bind(this, function(entry) {
                let createButton = builder.get_object('create_button');
                createButton.sensitive = !!entry.text;
            }));

        dialog.show();
    },
}
