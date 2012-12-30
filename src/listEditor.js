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

const Config = imports.config;
const Global = imports.global;
const MainController = imports.mainController;

const ListEditorController = new Lang.Class({
    Name: 'ListEditorController',
    Extends: MainController.Controller,

    _init: function(mainController, list) {
        this.parent(mainController);

        this._view = new ListEditorView();
        for(let i = 0; i < list.items.length; i++)
        {
            let item = list.items[i];
            this._view.addItem(item.completed, item.title);
        }
    },

    activate: function() {
        this.window.setToolbarWidget(null);
        this.window.setContentActor(this._view);
    },

    deactivate: function() {
        this.window.setToolbarWidget(null);
        this.window.setContentActor(null);
    },

    onCancel: function() {
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
        builder.add_from_resource('/org/gnome/todo/ui/note_editor.glade');
        this._noteEditor = builder.get_object('note_editor');
        this._noteEditor.hide();
        grid.attach(this._noteEditor, 1, 0, 1, 1);

        this._listBox.connect('child-activated',
            Lang.bind(this, this._childActivated));
    },

    addItem: function(done, title) {
        let listItem = new ListItem(done, title);
        this._listBox.add(listItem);
    },

    _childActivated: function(listBox, listItem) {
        this._noteEditor.show();

        if (this._activatedItem)
            this._activatedItem.titleNotebook.set_current_page(0);

        listItem.titleNotebook.set_current_page(1);
        listItem.titleEntry.grab_focus();
        this._activatedItem = listItem;
    }
});

const ListItem = new Lang.Class({
    Name: 'ListItem',
    Extends: Gtk.Bin,

    _init: function(done, title) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_item.glade');
        this.add(builder.get_object('grid'));

        this.doneCheck = builder.get_object('done_check');
        this.titleNotebook = builder.get_object('title_notebook');
        this.titleLabel =  builder.get_object('title_label');
        this.titleEntry = builder.get_object('title_entry');

        this.doneCheck.active = done;
        this.titleLabel.label = title;
        this.titleEntry.text = title;

        this.show();
    }
});