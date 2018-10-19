
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {LayoutApp, WindowState} from '../../client/types';
import {model} from '../main';
import {WindowIdentity} from '../model/DesktopWindow';
import {promiseMap} from '../snapanddock/utils/async';

export const getGroup = (identity: Identity): Promise<Identity[]> => {
    const {uuid, name} = identity;
    const ofWin = fin.desktop.Window.wrap(uuid, name!);
    // v2api getgroup broken
    return new Promise((res, rej) => {
        ofWin.getGroup((group: fin.OpenFinWindow[]) => {
            const groupIds = group
                                 .map((win: fin.OpenFinWindow) => {
                                     return {uuid: win.uuid, name: win.name};
                                 })
                                 .filter((id: Identity) => {
                                     return id.uuid !== uuid || id.name !== name;
                                 });
            res(groupIds);
            return;
        }, () => res([]));
    });
};

export const regroupLayout = async (apps: LayoutApp[]) => {
    await promiseMap(apps, async(app: LayoutApp): Promise<void> => {
        await groupWindow(app.mainWindow);
        await promiseMap(app.childWindows, async (child: WindowState) => {
            await groupWindow(child);
        });
    });
};

export const groupWindow = async (win: WindowState) => {
    if (win.isTabbed) {
        return;
    }
    const {uuid, name} = win;
    // const ofWin = await fin.Window.wrap({uuid, name});
    await promiseMap(win.windowGroup, async (w: Identity) => {
        if (w.uuid === 'layouts-service') {
            return;
        }

        if (win.name === 'App2 -  win1') {
            return;
        }


        console.log("win", win);
        console.log("win.name", win.name);
        console.log("w", w);

        // const windowToGroup = await fin.Window.wrap({uuid: w.uuid, name: w.name});
        await model.expect(win as WindowIdentity);
        await model.expect(w as WindowIdentity);

        const ofWinModel = await model.getWindow(win);
        const windowToModel = await model.getWindow({uuid: w.uuid, name: w.name!});
        // ERROR: windowToGroup returns even if the window doesn't exist, so the if (windowToGroup) always results in true.
        
        // Wrap returns even if the window doesn't exist. We need a windowToGroup.exists function.
        if (windowToModel && ofWinModel) {
            console.log("WINDOW TO MODEL");
            const windowToModelSnapGroup = windowToModel.getSnapGroup();
            if (windowToModelSnapGroup) {
                console.log('ofWinModel', ofWinModel);
                console.log('windowToModelSnapGroup', windowToModelSnapGroup);
                ofWinModel.setSnapGroup(windowToModelSnapGroup);
                // windowToModelSnapGroup.addWindow(ofWinModel);
            }
            // Add the window to the same group as the target window
            // await windowToGroup.joinGroup(ofWin)
            //     .then(win => console.log('joined!', win))
            //     .catch((err: Error) => console.log('Attempted to group a window that does not exist', windowToGroup, err));
        } else {
            console.error('Attempted to group a window that does not exist');
        }
    });
};