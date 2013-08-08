/*
 * Copyright (c) 2013 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome To Do is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome To Do is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome To Do; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 */

const Gd = imports.gi.Gd;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const _ = imports.gettext.gettext;
const Lang = imports.lang;
const Signals = imports.signals;

const Global = imports.global;
const Tweener = imports.tweener.tweener;
const Utils = imports.utils;

const SelectionController = new Lang.Class({
    Name: 'SelectionController',

    _init: function(listsController, listsView) {
        this._listsController = listsController;
        this._listsView = listsView;

        this._initActions();

        listsController.window.connect('action-state-changed::lists.selection',
            Lang.bind(this, this._selectionStateChanged));

        this._mainView = listsView.mainView;
        this._mainView.connect('view-selection-changed',
            Lang.bind(this, this._viewSelectionChanged));

        this._selectionToolbar = listsView.selectionToolbar;
        this._selectionToolbar.connect('delete-button-clicked',
            Lang.bind(this, this._deleteButtonClicked));
        this._selectionToolbar.connect('rename-button-clicked',
            Lang.bind(this, this._renameButtonClicked));
    },

    _initActions: function() {
        let actionEntries = [
            {
                name: 'select-all',
                callback: this._selectAll
            },
            {
                name: 'select-none',
                callback: this._selectNone
            }];
        this._actions = Utils.createActions(this, actionEntries);
    },

    _selectionStateChanged: function(actionGroup, actionName, state) {
        this._mainView.set_selection_mode(state.get_boolean());
        this._selectionToolbar.reveal_child = state.get_boolean();

        if (state.get_boolean())
            Utils.addActions(this._listsController.window, this._actions);
        else
            Utils.removeActions(this._listsController.window, this._actions);
    },

    _viewSelectionChanged: function(mainView) {
        let selection = this._mainView.get_selection();

        if (selection.length > 0) {
            this._selectionToolbar.deleteButton.sensitive = true;

            if (selection.length == 1)
                this._selectionToolbar.renameButton.sensitive = true;
            else
                this._selectionToolbar.renameButton.sensitive = false;
        }
        else {
            this._selectionToolbar.deleteButton.sensitive = false;
            this._selectionToolbar.renameButton.sensitive = false;
        }
    },

    _deleteButtonClicked: function() {
        let selection = this._mainView.get_selection();

        /* Need to get all lists before we start to remove them because
         * the selection paths will be invalid after we the model changes. */
        let lists = [];
        for (let i = 0; i < selection.length; i++)
        {
            let path = selection[i];
            let list = this._listsController.getListFromPath(path);
            lists.push(list);
        }

        for (let i = 0; i < lists.length; i++)
        {
            let list = lists[i];
            list.source.deleteTaskList(list.id);
        }

        // No lists may still be selected so notify that the selection has changed
        this._viewSelectionChanged(this._mainView);
    },

    _renameButtonClicked: function() {

        let selection = this._mainView.get_selection();
        if (selection.length != 1)
            return;

        let list = this._listsController.getListFromPath(selection[0]);

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/rename_list_dialog.glade');

        let dialog = builder.get_object('rename_list_dialog');
        dialog.set_transient_for(this._listsController.window);

        let entry = builder.get_object('entry');
        entry.text = list.title;
        entry.connect('changed',
            Lang.bind(this, function(entry) {
                let updateButton = builder.get_object('update_button');
                updateButton.sensitive = (entry.text && entry.text != list.title);
            }));
        entry.connect('activate', function(entry) {
            if (entry.text && entry.text != list.title)
                dialog.response(Gtk.ResponseType.ACCEPT);
        });

        dialog.connect('response',
            Lang.bind(this, function(dialog, response_id) {
                if (response_id == Gtk.ResponseType.ACCEPT) {
                    list.title = entry.text;
                }

                dialog.destroy();
            }));

        dialog.show();
    },

    _selectAll: function() {
        this._mainView.select_all();
    },

    _selectNone: function() {
        this._mainView.unselect_all();
    }
});

const SelectionToolbar = new Lang.Class({
    Name: 'SelectionToolbar',
    Extends: Gtk.Revealer,

    _init: function() {
        this.parent({ halign: Gtk.Align.FILL, valign: Gtk.Align.END,
            transition_type: Gtk.RevealerTransitionType.SLIDE_UP });

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/selection_toolbar.glade');
        this._toolbar = builder.get_object('selection-bar');

        this.renameButton = builder.get_object('rename-button');
        this.renameButton.connect('clicked',
            Lang.bind(this, function(button) { this.emit('rename-button-clicked'); }));

        this.deleteButton = builder.get_object('delete-button');
        this.deleteButton.connect('clicked',
            Lang.bind(this, function(button) { this.emit('delete-button-clicked'); }));

        this.add(this._toolbar);
        this.show();
    }
});

Signals.addSignalMethods(SelectionToolbar.prototype);