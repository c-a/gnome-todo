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

const GObject = imports.gi.GObject;
const GdPrivate = imports.gi.GdPrivate;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const DatePicker = new Lang.Class({
    Name: 'DatePicker',
    Extends: Gtk.Bin,

    Signals: {
        'date-changed': {}
    },

    _init: function() {
        this.parent();

        this._date = null;

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

    getDate: function() {
        return this._date;
    },

    setDate: function(date) {
        if (GdPrivate.date_time_equal(this._date, date))
            return;

        this._date = date;

        let text;
        if (date)
            text = date.format('%x');
        else
        {
            date = GLib.DateTime.new_now_local();
            text = '';
        }

        this._entry.text = text;

        this._blockDaySelected = true;
        this._calendar.select_month(date.get_month(), date.get_year());
        this._calendar.select_day(date.get_day_of_month());
        this._blockDaySelected = false;

        this.emit('date-changed');
    },

    _daySelected: function(calendar)
    {
        if (this._blockDaySelected)
            return;

        let [year, month, day] = calendar.get_date();
        let date = GLib.DateTime.new(GLib.TimeZone.new_utc(), year, month, day,
            0, 0, 0);
        this.setDate(date);
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
        this.setDate(null);
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