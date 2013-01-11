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

        this._list = list;

        this._toolbar = new ListEditorToolbar(list.title);
        this._toolbar.connect('back-button-clicked',
            Lang.bind(this, this._backButtonClicked));

        let source = Global.sourceManager.getItemById(list.sourceID);
        this._view = new ListEditorView(source, list);

        this._view.connect('delete',
            Lang.bind(this, this._listEditorDelete));
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
    Extends: GtkClutter.Actor,

    Signals: { 'save': { param_types: [ GObject.TYPE_OBJECT ] },
        'delete': { param_types: [GObject.TYPE_OBJECT ] },
    },

    _init: function(source, list) {
        this.parent({ x_expand: true, y_expand: true });

        this._source = source;
        this._list = list;

        let grid = new Gtk.Grid({ margin: 6 });
        grid.show();
        this.contents = grid;

        this.listBox = new EggListBox.ListBox();
        this.listBox.show();
        grid.attach(this.listBox, 0, 0, 1, 1);

        this.taskEditor = new TaskEditor(source);
        this.taskEditor.hide();
        grid.attach(this.taskEditor, 1, 0, 1, 1);

        this.taskEditor.connect('cancelled',
            Lang.bind(this, this._taskEditorCancelled));
        this.taskEditor.connect('save',
            Lang.bind(this, this._taskEditorSave));
        this.taskEditor.connect('delete',
            Lang.bind(this, this._taskEditorDelete));

        this.listBox.set_sort_func(
            Lang.bind(this, this._listBoxSortFunc));
        this.listBox.connect('child-activated',
            Lang.bind(this, this._childActivated));

        list.forEachItem(Lang.bind(this, function(task) {
            this.addItem(task);
        }));
        list.connect('item-added',
            Lang.bind(this, this._taskAdded));
        list.connect('item-removed',
            Lang.bind(this, this._taskRemoved));

        this.listBox.add(new NewListItem());
    },

    addItem: function(task) {
        let listItem = new ListItem(task, this._list.id);
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

    _taskAdded: function(list, task) {
        this.addItem(task);
    },

    _taskUpdated: function(list, task) {
    },
    
    _taskRemoved: function(list, task) {

        let listItems = this.listBox.get_children();
        for (let i = 0; i < listItems.length; i++) {
            let listItem = listItems[i];

            if (listItem.isNewListItem)
                continue;

            if (listItem.task && listItem.task.id == task.id) {
                if (listItem.active) {
                    this._activatedItem = listItem.deactivate(this);
                }
                this.listBox.remove(listItem);
                break;
            }
        }
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
        this._activatedItem = this._activatedItem.remove(this);
    }
});

const ListItem = new Lang.Class({
    Name: 'ListItem',
    Extends: Gtk.Bin,

    Properties: { 'titleModified': GObject.ParamSpec.boolean('titleModified',
        'TitleModified', 'If the title has been modfied', GObject.ParamFlags.READABLE, false)
    },

    _init: function(task, listID) {
        this.parent();

        this.isNewListItem = false;
        this.active = false;
        this._titleModified = false;
        this.task = task;
        this._listID = listID;

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
        {
            this._doneCheck.active = task.done;
            this._titleLabel.label = task.title;
            this._titleEntry.text = task.title;
        }

        this.show();
    },

    activate: function(listEditor) {
        this.active = true;

        this._titleNotebook.set_current_page(1);

        listEditor.taskEditor.setTask(this.task, this._listID);
        listEditor.taskEditor.show();

        return this;
    },

    deactivate: function(listEditor) {
        this.active = false;

        /* Remove the listItem if it's a new one. */
        if (!this.task) {
            listEditor.listBox.remove(this);
        }
        else
            this._titleNotebook.set_current_page(0);

        listEditor.taskEditor.hide();
    },

    remove: function(listEditor) {
        if (this.task) {
            listEditor.emit('delete', this);
            return this;
        }
        else {
            listEditor.listBox.remove(this);
            listEditor.taskEditor.hide();
            return null;
        }
    },

    get titleModified() {
        return this._titleModified;
    },

    get title() {
        if (this._titleEntry)
            return this._titleEntry.text;
        else
            return null;
    },

    _titleEntryChanged: function(entry) {
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

        this._noteTextBuffer = builder.get_object('note_textbuffer');
        this._listCombo = builder.get_object('list_combo');
        this._listStore = builder.get_object('list_store');

        let dueDatePlaceholder = builder.get_object('due_date_placeholder');
        this._dueDatePicker = new DatePicker();
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

        let dateTime = null;
        if (task && task.due)
            dateTime = Utils.dateTimeFromISO8601(task.due);
        this._dueDatePicker.setDateTime(dateTime);

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

const DatePicker = new Lang.Class({
    Name: 'DatePicker',
    Extends: Gtk.Bin,

    _init: function() {
        this.parent();

        this._entry = new Gtk.Entry({ 'editable': false });
        this.add(this._entry);
        this.show_all();

        this._window = new PopupWindow(this);

        this._calendar = new Gtk.Calendar();
        this._calendar.show();
        this._window.add(this._calendar);

        this._blockDaySelected = false;
        this._calendar.connect('day-selected',
            Lang.bind(this, this._daySelected));
        this._calendar.connect('day-selected-double-click',
            Lang.bind(this, this._daySelectedDoubleClick))
        
        this._entry.connect('button-press-event',
            Lang.bind(this, this._buttonPressEvent));
        this._entry.connect('activate',
            Lang.bind(this, this._entryActivate));
        this._entry.connect('backspace',
            Lang.bind(this, this._entryBackspace));
    },

    setDateTime: function(dateTime) {
        let text;
        if (dateTime)
            text = dateTime.format('%x');
        else
        {
            dateTime = GLib.DateTime.new_now_local();
            text = '';
        }

        this._entry.text = text;

        this._blockDaySelected = true;
        this._calendar.select_month(dateTime.get_month(), dateTime.get_year());
        this._calendar.select_day(dateTime.get_day_of_month());
        this._blockDaySelected = false;
    },

    _daySelected: function(calendar)
    {
        if (this._blockDaySelected)
            return;

        let [year, month, day] = calendar.get_date();
        let dateTime = GLib.DateTime.new(GLib.TimeZone.new_utc(), year, month, day,
            0, 0, 0);
        this.setDateTime(dateTime);
    },

    _daySelectedDoubleClick: function(calendar)
    {
        this._window.popdown(Gdk.CURRENT_TIME);
    },

    _buttonPressEvent: function(entry, event) {
        let [res, button] = event.get_button();

        if (button == Gdk.BUTTON_PRIMARY) {
            this._entry.grab_focus();
            this._popupCalendar(event);
            return true;
        }

        return false;
    },

    _entryActivate: function(entry) {
        this._popupCalendar(null);
    },

    _entryBackspace: function(entry, event) {
        this.setDateTime(null);
    },

    _popupCalendar: function(event)
    {
        if (this._window.visible)
            return;

        let [ret, x, y] = this.get_window().get_origin();
        let allocation = this.get_allocation();

        x += allocation.x;
        y += allocation.y + allocation.height;

        let device, time;
        if (event)
        {
            device = event.get_device();
            time = event.get_time();
        }
        else
        {
            device = null;
            time = Gdk.CURRENT_TIME;
        }
        this._window.popup(device, x, y, time);
    }
});

const PopupWindow = new Lang.Class({
    Name: 'PopupWindow',
    Extends: Gtk.Window,

    _init: function(parent) {
        this.parent({ 'type': Gtk.WindowType.POPUP, 'attached-to': parent,
            'destroy-with-parent': true, 'decorated': false });

        this._parent = parent;

        this.connect('button-press-event',
            Lang.bind(this, this._buttonPressEvent));
    },

    popup: function(device, x, y, time)
    {
        if (!device)
            device = Gtk.get_current_event_device();

        let keyboard, pointer;
        if (device.get_source() == Gdk.InputSource.KEYBOARD)
        {
            keyboard = device;
            pointer = device.get_associated_device();
        }
        else
        {
            pointer = device;
            keyboard = device.get_associated_device();
        }

        this.move(x, y);
        this.show();

        Gtk.device_grab_add(this, pointer, true);
        let ret = pointer.grab(this.get_window(), Gdk.GrabOwnership.WINDOW, true,
            Gdk.EventMask.BUTTON_PRESS_MASK, null, time);
        if (ret != Gdk.GrabStatus.SUCCESS)
        {
            Gtk.device_grab_remove(this, pointer);
            this.hide();
            return false;
        }

        let ret = keyboard.grab(this.get_window(), Gdk.GrabOwnership.WINDOW, true,
            Gdk.EventMask.KEY_PRESS_MASK | Gdk.EventMask.KEY_RELEASE_MASK, null,
            time);
        if (ret != Gdk.GrabStatus.SUCCESS)
        {
            pointer.ungrab(time);
            Gtk.device_grab_remove(this, pointer);
            this.hide();
            return false;
        }

        this._grabPointer = pointer;
        this._grabKeyboard = keyboard;

        let parentToplevel = this._parent.get_toplevel();
        if (parentToplevel instanceof Gtk.Window)
            this.set_transient_for(parentToplevel);

        return true;
    },

    popdown: function(time)
    {
        this._grabPointer.ungrab(time);
        Gtk.device_grab_remove(this, this._grabPointer);
        Gtk.device_grab_remove(this, this._grabKeyboard);

        this.hide();
    },

    _buttonPressEvent: function(window, event)
    {
        let [res, x, y] = event.get_coords();
        let allocation = this.get_allocation();

        if (x < allocation.x || x > (allocation.x + allocation.width) ||
            y < allocation.y || y > (allocation.y + allocation.height))
        {
            this.popdown(event.get_time());
            return true;
        }

        return false;
    },

    vfunc_key_release_event: function(event)
    {
        let handled = this.parent(event);
        if (handled)
            return true;

        this.popdown(Gdk.CURRENT_TIME);
        return true;
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