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
const ListsController = imports.listsController;

function MainController(mainWindow)
{
    this._init(mainWindow);
}

MainController.prototype = {
    _init: function(mainWindow) {
        this._mainWindow = mainWindow;

        this._controllerStack = [];
        this._currentController = null;

        // Add the initial controller
        let listsController = new ListsController.ListsController(mainWindow);
        this.pushController(listsController);
    },

    pushController: function(controller)
    {
        if (this._currentController) {
            this._currentController.deactivate();
            this._controllerStack.push(controller);
        }

        this._currentController = controller;
        controller.activate();
    },

    popController: function()
    {
        assert(this._controllerStack.length > 0);

        this._currentController.deactivate();

        this._currentController = this._controllerStack.pop();
        this._currentController.activate();
    }
}
