import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {Layout, LayoutApp, WindowState} from '../client/types';

export interface Workspace {
    id: string;
    layout: Layout;
}

import * as Layouts from '../client/main';

declare var window: _Window&{forgetMe: (identity: Identity) => void};

let numChildren = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

export async function createChild(parentWindowName: string): Promise<void> {
    const win = await openChild(parentWindowName + ' -  win' + numChildren, numChildren);
    win.show();
}

export function openChild(name: string, i: number, frame = true, url?: string) {
    numChildren++;
    const win = fin.Window.create({
        url: url || `${launchDir}/demo-window.html`,
        autoShow: false,
        defaultHeight: 250 + 50 * i,
        defaultWidth: 250 + 50 * i,
        defaultLeft: 320 * (i % 3),
        defaultTop: i > 2 ? 400 : 50,
        saveWindowState: false,
        frame,
        name
    });
    return win;
}

export async function onAppRes(layoutApp: LayoutApp): Promise<LayoutApp> {
    console.log('Apprestore called:', layoutApp);
    // We use the v1 version of Application.getCurrent() due to an event-loop bug
    // when calling the v2 version inside a channel callback. Due for fix in v35
    const ofApp = fin.desktop.Application.getCurrent();
    const openWindows = await new Promise<fin.OpenFinWindow[]>(res => ofApp.getChildWindows(res));
    const openAndPosition = layoutApp.childWindows.map(async (win, index) => {
        if (!openWindows.some((w: fin.OpenFinWindow) => w.name === win.name)) {
            const ofWin = await openChild(win.name, index, win.frame, win.info.url);
            await positionWindow(win);
        } else {
            await positionWindow(win);
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

// Positions a window when it is restored.
// If the window is supposed to be tabbed, makes it leave its group to avoid tab collision bugs
// Also given to the client to use.
const positionWindow = async (win: WindowState) => {
    try {
        const ofWin = await fin.Window.wrap(win);
        if (!win.isTabbed) {
            await ofWin.leaveGroup();
        }
        await ofWin.setBounds(win);


        // COMMENTED OUT FOR DEMO
        if (win.state === 'normal') {
            await ofWin.restore();
        } else if (win.state === 'minimized') {
            await ofWin.minimize();
        } else if (win.state === 'maximized') {
            await ofWin.maximize();
        }

        if (win.isShowing) {
            await ofWin.show();
        } else {
            await ofWin.hide();
        }
    } catch (e) {
        console.error('position window error', e);
    }
};

// Allow layouts service to save and restore this application
Layouts.onApplicationSave(() => {
    return {test: true};
});
Layouts.onAppRestore(onAppRes);
Layouts.ready();
