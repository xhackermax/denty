type Versioned={version:number;updatedAt:string};
export function resolveSyncConflict<T extends Versioned>({local,remote}:{local:T;remote:T}){
 if(local.version!==remote.version) return {winner:local.version>remote.version?'local':'remote',reason:'higher_version' as const};
 if(local.updatedAt===remote.updatedAt) return {winner:'equal' as const,reason:'same_version_and_time' as const};
 return {winner:Date.parse(local.updatedAt)>Date.parse(remote.updatedAt)?'local':'remote',reason:'latest_timestamp' as const};
}
