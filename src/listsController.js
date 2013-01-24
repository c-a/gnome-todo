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
const ListEditor = imports.listEditor;
const ListsModel = imports.listsModel;
const ListsView = imports.listsView;
const ListsToolbar = imports.listsToolbar;
const MainController = imports.mainController;
const Selection = imports.selection;

const ListsController = new Lang.Class({
    Name: 'ListsController',
    Extends: MainController.Controller,

    _init: function(mainController) {
        this.parent(mainController);

        this._listsView = new ListsView.ListsView(this.window.contentView);

        // Create SelectionController handling selections
        this._selectionController = new Selection.SelectionController(this, this._listsView);
        this._selectionModeActive = false;
        
        this._toolbar = new ListsToolbar.ListsToolbar();

        this._model = new ListsModel.ListsModel();
        this._listsView.mainView.set_model(this._model);
        this._model.connect('row-inserted', Lang.bind(this, this._updateContentView));
        this._model.connect('row-deleted', Lang.bind(this, this._updateContentView));

        this._outstandingLoads = 0;
        this._outstandingSyncs = 0;

        this._toolbar.connect('selection-mode-toggled',
            Lang.bind(this, this._selectionModeToggled));
        this._toolbar.connect('new-button-clicked',
            Lang.bind(this, this._newButtonClicked));

        this._listsView.mainView.connect('item-activated',
            Lang.bind(this, this._itemActivated));

        Global.sourceManager.forEachItem(Lang.bind(this, function(source) {
            this._sourceAdded(null, source);
        }));
        Global.sourceManager.connect('item-added',
            Lang.bind(this, this._sourceAdded));
        Global.sourceManager.connect('item-removed',
            Lang.bind(this, this._sourceRemoved));
    },

    activate: function() {
        this.window.setToolbarWidget(this._toolbar);
    },

    deactivate: function() {
        this.window.setToolbarWidget(null);
    },

    getView: function() {
        return this._listsView;
    },

    sync: function() {
        // FIXME: Should only sync loaded sources
        Global.sourceManager.forEachItem(Lang.bind(this, function(source) {
            this._syncSource(source);
        }));
    },

    shutdown: function() {
        // FIXME: Should only save loaded sources
        Global.sourceManager.forEachItem(Lang.bind(this, function(source) {
            source.save();
        }));
    },

    _sourceAdded: function(manager, source) {
        this._loadSource(source);
    },

    _sourceRemoved: function(manager, source) {
        this._model.removeSource(source);
        this._updateContentView();
    },

    _selectionModeToggled: function(toolbar, active) {
        this._setSelectionMode(active);
    },

    _setSelectionMode: function(active) {
        if (this._selectionModeActive == active)
            return;
        this._selectionModeActive = active;

        this._toolbar.setSelectionMode(active);
        this._selectionController.setActive(active);
    },

    _sourceSaveError: function(source, error) {
        let notification = new Gtk.Label({ label: error.message });
        Global.notificationManager.addNotification(notification);
    },

    _loadSource: function(source) {
        this._outstandingLoads++;
        this._updateContentView();

        source.load(Lang.bind(this, function(error) {
            this._outstandingLoads--;

            if (error) {
                let notification = new Gtk.Label({ label: error.message });
                Global.notificationManager.addNotification(notification);

                this._updateContentView();
                return;
            }

            this._model.addSource(source);
            source.connect('save-error', this._sourceSaveError);
            this._syncSource(source);

            this._updateContentView();
        }));
    },

    _syncSource: function(source) {
        this._outstandingSyncs++;

        source.sync(Lang.bind(this, function(error) {
            this._outstandingSyncs--;

            if (error) {
                let notification = new Gtk.Label({ label: error.message });
                Global.notificationManager.addNotification(notification);
                return;
            }
        }));
    },

    _updateContentView: function() {
        if (this._outstandingLoads > 0)
        {
            this._toolbar.setNewButtonSensitive(false);
            this._listsView.showLoading(true);
        }

        else {
            if (Global.sourceManager.getItemsCount() == 0) {
                this._toolbar.setNewButtonSensitive(false);
                this._listsView.showNoAccounts();
            }
            else {
                this._toolbar.setNewButtonSensitive(true);

                if (this._model.getListCount() == 0)
                    this._listsView.showNoResults();
                else
                    this._listsView.showMainView();
            }
        }
    },

    _newButtonClicked: function(toolbar) {

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/new_list_dialog.glade');

        let dialog = builder.get_object('new_list_dialog');
        dialog.set_transient_for(this.window);

        let entry = builder.get_object('entry');
        entry.connect('changed',
            Lang.bind(this, function(entry) {
                let createButton = builder.get_object('create_button');
                createButton.sensitive = !!entry.text;
            }));
        entry.connect('activate', function(entry) {
            if (entry.text)
                dialog.response(Gtk.ResponseType.ACCEPT);
        });

        dialog.connect('response',
            Lang.bind(this, function(dialog, response_id) {

                if (response_id == Gtk.ResponseType.ACCEPT)
                {
                    let source = Global.sourceManager.getDefaultSource();

                    let entry = builder.get_object('entry');
                    source.createTaskList(entry.text);
                }

                dialog.destroy();
            }));

        dialog.show();
    },

    _itemActivated: function(mainView, id, path) {
        let list = this._model.getListFromPath(path);
        let listEditor = new ListEditor.ListEditorController(this.mainController, list);
        this.mainController.pushController(listEditor);
    },

    onCancel: function() {
        this._setSelectionMode(false);
    }
});
