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
const Utils = imports.utils;

const ListEditorController = new Lang.Class({
    Name: 'ListEditorController',
    Extends: MainController.Controller,

    _init: function(mainController, list) {
        this.parent(mainController);

        this._toolbar = new ListEditorToolbar(list.title);
        this._toolbar.connect('back-button-clicked',
            Lang.bind(this, this._backButtonClicked));

        let source = Global.sourceManager.getItemById(list.sourceID);
        this._view = new ListEditorView(source, list);
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

    _init: function(source, list) {
        this.parent({ x_expand: true, y_expand: true });

        this._source = source;
        this._list = list;

        let grid = new Gtk.Grid({ margin: 6 });
        grid.show();
        this.contents = grid;

        this._listBox = new EggListBox.ListBox();
        this._listBox.show();
        grid.attach(this._listBox, 0, 0, 1, 1);

        this._taskEditor = new TaskEditor(source);
        this._taskEditor.hide();
        grid.attach(this._taskEditor, 1, 0, 1, 1);

        this._listBox.set_sort_func(
            Lang.bind(this, this._listBoxSortFunc));
        this._listBox.connect('child-activated',
            Lang.bind(this, this._childActivated));

        this._listBox.add(new NewListItem());
    },

    addItem: function(task) {
        let listItem = new ListItem(task);
        this._listBox.add(listItem);
    },

    _listBoxSortFunc: function(item1, item2) {
        if (item1.isNewListItem)
            return 1;
        if (item2.isNewListItem)
            return -1;

        if (item1.position < item2.position)
            return -1;
        if (item1.position > item2.position)
            return 1;

        return 0;
    },

    _childActivated: function(listBox, listItem) {

        if (this._activatedItem)
            this._activatedItem.titleNotebook.set_current_page(0);

        if (listItem.isNewListItem) {
            this._taskEditor.hide();
            this._activatedItem = null;
        }
        else {
            listItem.titleNotebook.set_current_page(1);
            listItem.titleEntry.grab_focus();
            this._activatedItem = listItem;

            let task = listItem.task;
            this._taskEditor.setTask(task, this._list.id);
            this._taskEditor.show();
        }
    }
});

const ListItem = new Lang.Class({
    Name: 'ListItem',
    Extends: Gtk.Bin,

    _init: function(task) {
        this.parent();

        this.isNewListItem = false;
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

const NewListItem = new Lang.Class({
    Name: 'NewListItem',
    Extends: Gtk.Bin,

    _init: function(task) {
        this.parent();

        this.isNewListItem = true;
        this.task = task;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/new_list_item.glade');
        this.add(builder.get_object('grid'));

        this.show();
    }
});

const LIST_COMBO_COLUMN_TITLE = 0;
const LIST_COMBO_COLUMN_ID    = 1;

const TaskEditor = new Lang.Class({
    Name: 'TaskEditor',
    Extends: Gtk.Bin,

    _init: function(source) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/task_editor.glade');
        this._taskEditor = builder.get_object('task_editor');
        this.add(this._taskEditor);

        this._noteTextBuffer = builder.get_object('note_textbuffer');
        this._listCombo = builder.get_object('list_combo');
        this._listStore = builder.get_object('list_store');

        let dueDatePlaceholder = builder.get_object('due_date_placeholder');
        this._dueDatePicker = new DatePicker();
        dueDatePlaceholder.add(this._dueDatePicker);

        this._setSource(source);
    },

    setTask: function(task, listID) {
        this._task = task;

        if (task.notes)
            this._noteTextBuffer.text = task.notes;
        else
            this._noteTextBuffer.text = '';

        let dateTime = null;
        if (task.due)
            dateTime = Utils.dateTimeFromISO8601(task.due);
        this._dueDatePicker.setDateTime(dateTime);

        let iter = this._getIterFromListID(listID);
        this._listCombo.set_active_iter(iter);
    },

    _setSource: function(source) {
        this._source = source;

        source.forEachItem(Lang.bind(this, function(list) {
            this._listAdded(source, list);
        }));
        source.connect('item-added', Lang.bind(this, this._listAdded));
        source.connect('item-updated', Lang.bind(this, this._listUpdated));
        source.connect('item-removed', Lang.bind(this, this._listRemoved));
    },

    _listAdded: function(source, list) {
        let iter = this._listStore.append();
        this._listStore.set_value(iter, LIST_COMBO_COLUMN_ID, list.id);
        this._listStore.set_value(iter, LIST_COMBO_COLUMN_TITLE, list.title);
    },

    _listUpdated: function(source, list) {
        let iter = this._getIterFromListID(list.id);
        if (iter)
            this._listStore.set_value(iter, LIST_COMBO_COLUMN_TITLE, list.title);
    },

    _listRemoved: function(source, list) {
        let iter = this._getIterFromListID(list.id);
        if (iter)
            this._listStore.remove(iter);
    },

    _getIterFromListID: function(listID) {
        for (let [res, iter] = this._listStore.get_iter_first();
            res;
            res = this._listStore.iter_next(iter))
        {
            let id = this._listStore.get_value(iter, LIST_COMBO_COLUMN_ID);
            if (id == listID)
                return iter;
        }
        return null;
    }
});

const DatePicker = new Lang.Class({
    Name: 'DatePicker',
    Extends: Gtk.Bin,

    _init: function() {
        this.parent();

        this._entry = new Gtk.Entry({ 'editable': false });
        this.add(this._entry);

        this.show_all();
    },

    setDateTime: function(dateTime) {
        let text;
        if (dateTime)
            text = dateTime.format('%x');
        else
            text = '';

        this._entry.text = text;
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