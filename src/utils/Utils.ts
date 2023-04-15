/* Multi Key: Same Value map, usage: {"key1, key2": value} */
export function applyAlias(obj: object): void {
    for(const key of Object.keys(obj)){         // For every property (every command)
        const subkeys = key.split(/,\s?/);      // Get aliases (if any)
        if(subkeys.length == 1) continue;       // If there's only one subkey, continue
        const target = obj[key];                // Store the Command object
        delete obj[key];                        // Delete old property
        for(const subkey of subkeys)            // For every subproperty
            obj[subkey] = target;               // Assign old object
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

export async function sleepBool(ms: number): Promise<boolean> {
    await sleep(ms);
    return true;
}