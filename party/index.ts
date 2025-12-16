import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class Server implements Party.Server {
    constructor(public room: Party.Room) { }

    onConnect(conn: Party.Connection) {
        // No persistence - PartyKit is for real-time sync only
        // Persistence comes from: GitHub/KV (authoritative) + IndexedDB (offline cache)
        return onConnect(conn, this.room);
    }
}
