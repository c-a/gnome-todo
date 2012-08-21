/*
 * gnome-todo
 * Copyright (C) Carl-Anton Ingmarsson 2012 <carlantoni@gmail.com>
   * 
 * gnome-todo is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
   * 
 * gnome-todo is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.";
 */

#ifndef _GD_TASK_LISTS_ICON_VIEW_H_
#define _GD_TASK_LISTS_ICON_VIEW_H_

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define GD_TYPE_TASK_LISTS_ICON_VIEW             (gd_task_lists_icon_view_get_type ())
#define GD_TASK_LISTS_ICON_VIEW(obj)             (G_TYPE_CHECK_INSTANCE_CAST ((obj), GD_TYPE_TASK_LISTS_ICON_VIEW, GdTaskListsIconView))
#define GD_TASK_LISTS_ICON_VIEW_CLASS(klass)     (G_TYPE_CHECK_CLASS_CAST ((klass), GD_TYPE_TASK_LISTS_ICON_VIEW, GdTaskListsIconViewClass))
#define GD_IS_TASK_LISTS_ICON_VIEW(obj)          (G_TYPE_CHECK_INSTANCE_TYPE ((obj), GD_TYPE_TASK_LISTS_ICON_VIEW))
#define GD_IS_TASK_LISTS_ICON_VIEW_CLASS(klass)  (G_TYPE_CHECK_CLASS_TYPE ((klass), GD_TYPE_TASK_LISTS_ICON_VIEW))
#define GD_TASK_LISTS_ICON_VIEW_GET_CLASS(obj)   (G_TYPE_INSTANCE_GET_CLASS ((obj), GD_TYPE_TASK_LISTS_ICON_VIEW, GdTaskListsIconViewClass))

typedef struct _GdTaskListsIconViewClass GdTaskListsIconViewClass;
typedef struct _GdTaskListsIconView GdTaskListsIconView;
typedef struct _GdTaskListsIconViewPrivate GdTaskListsIconViewPrivate;



struct _GdTaskListsIconViewClass
{
  GtkIconViewClass parent_class;
};

struct _GdTaskListsIconView
{
  GtkIconView parent_instance;

  GdTaskListsIconViewPrivate *priv;
};

GType gd_task_lists_icon_view_get_type (void) G_GNUC_CONST;

G_END_DECLS

#endif /* _GD_TASK_LISTS_ICON_VIEW_H_ */
