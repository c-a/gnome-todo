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

const EggListBox = imports.gi.EggListBox;
const GObject = imports.gi.GObject;
const GtkClutter = imports.gi.GtkClutter;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const Global = imports.global;
const MainController = imports.mainController;

const ListEditorController = new Lang.Class({
    Name: 'ListEditorController',
    Extends: MainController.Controller,

    _init: function(mainController, list) {
        this.parent(mainController);

        this._toolbar = new ListEditorToolbar(list.title);
        this._toolbar.connect('back-button-clicked',
            Lang.bind(this, this._backButtonClicked));

        this._view = new ListEditorView();
        for(let i = 0; i < list.items.length; i++)
        {
            let task = list.items[i];
            this._view.addItem(task);
        }
    },

    activate: function() {
        this.window.setToolbarWidget(this._toolbar);
        this.window.setContentActor(this._view);
    },

    deactivate: function() {
        this.window.setToolbarWidget(null);
        this.window.setContentActor(null);
    },

    onCancel: function() {
        this.mainController.popController();
    },

    _backButtonClicked: function(toolbar) {
        this.mainController.popController();
    }
});

const ListEditorView = new Lang.Class({
    Name: 'ListEditorView',
    Extends: GtkClutter.Actor,

    _init: function(contentView) {
        this.parent({ x_expand: true, y_expand: true });

        this._contentView = contentView;

        let grid = new Gtk.Grid({ margin: 6 });
        grid.show();
        this.contents = grid;

        this._listBox = new EggListBox.ListBox();
        this._listBox.show();
        grid.attach(this._listBox, 0, 0, 1, 1);

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/task_editor.glade');
        this._taskEditor = builder.get_object('task_editor');
        this._taskEditor.hide();
        grid.attach(this._taskEditor, 1, 0, 1, 1);

        this._noteTextBuffer = builder.get_object('note_textbuffer');

        this._listBox.connect('child-activated',
            Lang.bind(this, this._childActivated));
    },

    addItem: function(task) {
        let listItem = new ListItem(task);
        this._listBox.add(listItem);
    },

    _childActivated: function(listBox, listItem) {
        this._taskEditor.show();

        if (this._activatedItem)
            this._activatedItem.titleNotebook.set_current_page(0);

        listItem.titleNotebook.set_current_page(1);
        listItem.titleEntry.grab_focus();
        this._activatedItem = listItem;

        let task = listItem.task;
        if (task.notes)
            this._noteTextBuffer.text = task.notes;
        else
            this._noteTextBuffer.text = '';
    }
});

const ListItem = new Lang.Class({
    Name: 'ListItem',
    Extends: Gtk.Bin,

    _init: function(task) {
        this.parent();

        this.task = task;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_item.glade');
        this.add(builder.get_object('grid'));

        this.doneCheck = builder.get_object('done_check');
        this.titleNotebook = builder.get_object('title_notebook');
        this.titleLabel =  builder.get_object('title_label');
        this.titleEntry = builder.get_object('title_entry');

        this.doneCheck.active = task.done;
        this.titleLabel.label = task.title;
        this.titleEntry.text = task.title;

        this.show();
    }
});

const ListEditorToolbar = new Lang.Class({
    Name: 'ListEditorToolbar',
    Extends: Gtk.Bin,

    _init: function(title) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_editor_toolbar.glade');
        this.add(builder.get_object('grid'));
        this.show();

        let backButton = builder.get_object('back_button');
        backButton.connect('clicked',
            Lang.bind(this, function(button) {
                this.emit('back-button-clicked')
            }));

        let sendButton = builder.get_object('send_button');
        sendButton.connect('clicked',
            Lang.bind(this, function(button) {
                this.emit('send-button-clicked')
            }));

        this._titleLabel = builder.get_object('title_label');
        this.setTitle(title);
    },

    setTitle: function(title) {
        this._titleLabel.label = title;
    },

    setToolbar: function(mainToolbar) {
        this._mainToolbar = mainToolbar;
    }
});
Signals.addSignalMethods(ListEditorToolbar.prototype);