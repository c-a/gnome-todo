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

#ifndef _GD_TASK_LIST_RENDERER_H
#define _GD_TASK_LIST_RENDERER_H

#include <glib-object.h>

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define GD_TYPE_TASK_LIST_RENDERER gd_task_list_renderer_get_type()

#define GD_TASK_LIST_RENDERER(obj) \
  (G_TYPE_CHECK_INSTANCE_CAST ((obj), \
   GD_TYPE_TASK_LIST_RENDERER, GdTaskListRenderer))

#define GD_TASK_LIST_RENDERER_CLASS(klass) \
  (G_TYPE_CHECK_CLASS_CAST ((klass), \
   GD_TYPE_TASK_LIST_RENDERER, GdTaskListRendererClass))

#define GD_IS_TASK_LIST_RENDERER(obj) \
  (G_TYPE_CHECK_INSTANCE_TYPE ((obj), \
   GD_TYPE_TASK_LIST_RENDERER))

#define GD_IS_TASK_LIST_RENDERER_CLASS(klass) \
  (G_TYPE_CHECK_CLASS_TYPE ((klass), \
   GD_TYPE_TASK_LIST_RENDERER))

#define GD_TASK_LIST_RENDERER_GET_CLASS(obj) \
  (G_TYPE_INSTANCE_GET_CLASS ((obj), \
   GD_TYPE_TASK_LIST_RENDERER, GdTaskListRendererClass))

typedef struct _GdTaskListRenderer GdTaskListRenderer;
typedef struct _GdTaskListRendererClass GdTaskListRendererClass;
typedef struct _GdTaskListRendererPrivate GdTaskListRendererPrivate;

struct _GdTaskListRenderer
{
  GtkCellRenderer parent;

  GdTaskListRendererPrivate *priv;
};

struct _GdTaskListRendererClass
{
  GtkCellRendererClass parent_class;
};

GType gd_task_list_renderer_get_type (void) G_GNUC_CONST;

GtkCellRenderer *gd_task_list_renderer_new (void);

G_END_DECLS

#endif /* _GD_TASK_LIST_RENDERER_H */
