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
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const DatePicker = imports.datePicker;
const Global = imports.global;
const MainController = imports.mainController;
const Utils = imports.utils;

const ListEditorController = new Lang.Class({
    Name: 'ListEditorController',
    Extends: MainController.Controller,

    _init: function(mainController, list) {
        this.parent(mainController);

        this._list = list;

        this._toolbar = new ListEditorToolbar(list.title);
        this._toolbar.connect('back-button-clicked',
            Lang.bind(this, this._backButtonClicked));

        let source = Global.sourceManager.getItemById(list.sourceID);
        this._view = new ListEditorView(source, list);

        this._view.connect('save',
            Lang.bind(this, this._listEditorSave));
        this._view.connect('delete',
            Lang.bind(this, this._listEditorDelete));

        list.forEachItem(Lang.bind(this, function(task) {
            this._view.addItem(task);
        }));
        list.connect('item-removed',
            Lang.bind(this, this._taskRemoved));
    },

    activate: function() {
        this.window.setToolbarWidget(this._toolbar);
    },

    deactivate: function() {
        this.window.setToolbarWidget(null);
    },

    getView: function() {
        return this._view;
    },

    onCancel: function() {
        this.mainController.popController();
    },

    _backButtonClicked: function(toolbar) {
        this.mainController.popController();
    },

    _taskRemoved: function(list, task) {
        let item = this._view.getItemForTask(task);
        if (item)
            this._view.removeItem(item);
    },

    _listEditorSave: function(view, listItem) {

        // Create a new task if the listItem doesn't have a task yet.
        if (!listItem.task) {
            this._list.createTask(listItem.title, listItem.completed, null, null,
                Lang.bind(this, function(error, task) {
                    if (error) {
                        let notification = new Gtk.Label({ label: error.message });
                        Global.notificationManager.addNotification(notification);
                        return;
                    }

                    listItem.setTask(task);
                }));
        }
        // Update the task otherwise
        else {
            //TODO: Implement!!!
        }
    },

    _listEditorDelete: function(view, listItem) {
        let task = listItem.task;

        this._list.deleteTask(task.id, Lang.bind(this, function(error) {
            if (error) {
                let notification = new Gtk.Label({ label: error.message });
                Global.notificationManager.addNotification(notification);
            }
        }));
    }
});

const ListEditorView = new Lang.Class({
    Name: 'ListEditorView',
    Extends: Gtk.Paned,

    Signals: { 'save': { param_types: [ GObject.TYPE_OBJECT ] },
        'delete': { param_types: [GObject.TYPE_OBJECT ] },
    },

    _init: function(source, list) {
        this.parent({ orientation: Gtk.Orientation.HORIZONTAL });

        this._source = source;
        this._list = list;

        this.show();
        
        this.listBox = new EggListBox.ListBox();
        this.listBox.show();
        this.pack1(this.listBox, true, false);

        this.taskEditor = new TaskEditor(source);
        this.pack2(this.taskEditor, false, false);
        this.taskEditor.hide();

        this.taskEditor.connect('cancelled',
            Lang.bind(this, this._taskEditorCancelled));
        this.taskEditor.connect('save',
            Lang.bind(this, this._taskEditorSave));
        this.taskEditor.connect('delete',
            Lang.bind(this, this._taskEditorDelete));

        this.listBox.set_sort_func(
            Lang.bind(this, this._listBoxSortFunc));
        this.listBox.set_separator_funcs(
            Lang.bind(this, this._listBoxSeparatorFunc));

        this.listBox.connect('child-activated',
            Lang.bind(this, this._childActivated));

        this.listBox.add(new NewListItem());
    },

    addItem: function(task) {
        let listItem = new ListItem(this._list.id, this, task);
        this.listBox.add(listItem);

        listItem.connect('notify::titleModified',
            Lang.bind(this, function(item) {
                if (item != this._activatedItem)
                    return;

                let saveSensitive = item.title && item.titleModified;
                this.taskEditor.setSaveSensitive(saveSensitive);
            }));

        return listItem;
    },

    removeItem: function(listItem) {
        if (listItem.active)
            this._activatedItem = listItem.deactivate(this);

        // Find the next and previous items.
        let prevItem = null, nextItem = null;
        let listItems = this.listBox.get_children();
        for (let i = 0; i < listItems.length; i++) {
            let item = listItems[i];

            if (item == listItem) {
                if (i + 1 < listItems.length) {
                    nextItem = listItems[i + 1];
                    if (nextItem.isNewListItem)
                        nextItem = null;
                }
                break;
            }
            prevItem = item;
        }

        this.listBox.remove(listItem);

        if (prevItem)
            this._activatedItem = prevItem.activate(this);
        else if (nextItem)
            this._activatedItem = nextItem.activate(this);
    },

    getItemForTask: function(task) {
        let listItems = this.listBox.get_children();
        for (let i = 0; i < listItems.length; i++) {
            let listItem = listItems[i];

            if (listItem.isNewListItem)
                continue;

            if (listItem.task && listItem.task.id == task.id)
                return listItem;
        }
        return null;
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

    
    _listBoxSeparatorFunc: function(child, before) {

        return new Gtk.Separator({ 'orientation': Gtk.Orientation.HORIZONTAL });
    },

    _childActivated: function(listBox, listItem) {

        if (this._activatedItem)
            this._activatedItem.deactivate(this);

        this._activatedItem = listItem.activate(this);
    },

    _taskEditorCancelled: function(taskEditor) {

        this._activatedItem.deactivate(this);
        this._activatedItem = null;

        /* Set SelectionMode to NONE to unselect the item. */
        this.listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.listBox.set_selection_mode(Gtk.SelectionMode.SINGLE);
    },

    _taskEditorSave: function(taskEditor) {
        this.emit('save', this._activatedItem);
    },

    _taskEditorDelete: function(taskEditor) {
        let listItem = this._activatedItem;

        if (listItem.task)
            this.emit('delete', listItem);
        else
            this.removeItem(listItem);
    }
});

const ListItem = new Lang.Class({
    Name: 'ListItem',
    Extends: Gtk.Bin,

    Properties: { 'titleModified': GObject.ParamSpec.boolean('titleModified',
        'TitleModified', 'If the title has been modfied', GObject.ParamFlags.READABLE, false)
    },

    _init: function(listID, listEditor, task) {
        this.parent();

        this.isNewListItem = false;
        this.active = false;
        this._titleModified = false;
        this._listID = listID;
        this._listEditor = listEditor;
        this.task = task;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_item.glade');
        this.add(builder.get_object('grid'));

        this._doneCheck = builder.get_object('done_check');
        this._titleNotebook = builder.get_object('title_notebook');
        this._titleLabel =  builder.get_object('title_label');

        this._titleEntry = builder.get_object('title_entry');
        this._titleEntry.connect('changed',
            Lang.bind(this, this._titleEntryChanged));

        if (task)
            this.setTask(task);

        this.show();
    },

    setTask: function(task) {
        this.task = task;

        this._doneCheck.active = task.completed;
        this._titleLabel.label = task.title;
        this._titleEntry.text = task.title;
        // titleModified may change even if the text of the entry haven't changed.
        this._titleEntryChanged(this._titleEntry);

        if (this.active)
            this._listEditor.taskEditor.setTask(this.task, this._listID);
    },
    
    activate: function(listEditor) {
        this.active = true;

        this._titleNotebook.set_current_page(1);

        listEditor.taskEditor.setTask(this.task, this._listID);
        listEditor.taskEditor.show();

        listEditor.listBox.select_child(this);
        this._titleEntry.grab_focus();

        return this;
    },

    deactivate: function(listEditor) {
        this.active = false;

        this._titleNotebook.set_current_page(0);
        listEditor.taskEditor.hide();
    },

    get titleModified() {
        return this._titleModified;
    },

    get title() {
        if (this._titleEntry)
            return this._titleEntry.text;
        return null;
    },

    get completed() {
        if (this._doneCheck)
            return this._doneCheck.active;
        return false;
    },

    _titleEntryChanged: function(entry) {

        this._titleLabel.label = entry.text;

        let titleModified = this._titleModified;

        if (this.task)
            this._titleModified = (entry.text != this.task.title);
        else
            this._titleModified = !!entry.text;

        if (this._titleModified != titleModified)
            this.notify('titleModified');
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
    },

    activate: function(listEditor) {
        let newItem = listEditor.addItem(null);
        listEditor.listBox.select_child(newItem);

        newItem.activate(listEditor);
        return newItem;
    }
});

const LIST_COMBO_COLUMN_TITLE = 0;
const LIST_COMBO_COLUMN_ID    = 1;

const TaskEditor = new Lang.Class({
    Name: 'TaskEditor',
    Extends: Gtk.Bin,

    Signals: {
        'cancelled': {},
        'save': {},
        'delete': {}
    },

    _init: function(source) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/task_editor.glade');
        this._taskEditor = builder.get_object('task_editor');
        this.add(this._taskEditor);
        this.show_all();

        this._noteTextBuffer = builder.get_object('note_textbuffer');
        this._listCombo = builder.get_object('list_combo');
        this._listStore = builder.get_object('list_store');

        let dueDatePlaceholder = builder.get_object('due_date_placeholder');
        this._dueDatePicker = new DatePicker.DatePicker();
        dueDatePlaceholder.add(this._dueDatePicker);

        let deleteButton = builder.get_object('delete_button');
        deleteButton.connect('clicked', Lang.bind(this, function(button) {
            this.emit('delete');
        }));

        let cancelButton = builder.get_object('cancel_button');
        cancelButton.connect('clicked', Lang.bind(this, function(button) {
            this.emit('cancelled');
        }));

        this._saveButton = builder.get_object('save_button');
        this._saveButton.connect('clicked', Lang.bind(this, function(button) {
            this.emit('save');
        }));

        this._setSource(source);
    },

    setTask: function(task, listID) {
        this._task = task;

        if (task && task.notes)
            this._noteTextBuffer.text = task.notes;
        else
            this._noteTextBuffer.text = '';

        let dueDate = task ? task.dueDate : null;
        this._dueDatePicker.setDateTime(dueDate);

        let iter = this._getIterFromListID(listID);
        this._listCombo.set_active_iter(iter);
    },

    setSaveSensitive: function(sensitive) {
        this._saveButton.set_sensitive(sensitive);
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

const ListEditorToolbar = new Lang.Class({
    Name: 'ListEditorToolbar',
    Extends: Gtk.Bin,

    _init: function(title) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_editor_toolbar.glade');
        this._headerBar = builder.get_object('header-bar');
        this.add(this._headerBar);
        this.show();

        let backButton = builder.get_object('back-button');
        backButton.connect('clicked',
            Lang.bind(this, function(button) {
                this.emit('back-button-clicked')
            }));

        let sendButton = builder.get_object('send-button');
        sendButton.connect('clicked',
            Lang.bind(this, function(button) {
                this.emit('send-button-clicked')
            }));

        this._headerBar.title = title;
    },

    setTitle: function(title) {
        this._headerBar.title = title;
    },

    setToolbar: function(mainToolbar) {
        this._mainToolbar = mainToolbar;
    }
});
Signals.addSignalMethods(ListEditorToolbar.prototype);