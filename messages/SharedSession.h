#ifndef SHARED_SESSION_HPP
#define SHARED_SESSION_HPP

// #include <map>
// #include <mutex>
// #include <chrono>
// #include <string>
// #include <memory>
// #include <random>
// #include <cstdlib>
#include "MsgSession.h"

class MsgSession;

class SharedSession {
protected:
    // all the shared sessions (static/global)
    inline static std::mutex shared_sessions_mutex;
    inline static std::map<std::string, std::weak_ptr<SharedSession>> shared_sessions;

    std::string id;

    // sessions that are joined to this shared session
    std::mutex msg_sessions_mutex;
    std::set<std::shared_ptr<MsgSession>> msg_sessions;

public:
    //NOTE: SharedSession factory, implement this yourself, so you can return a subclass if needed. link-time implementation.
    static std::shared_ptr<SharedSession> create(const std::string & id);

    // get a shared session by id-string (calls create if it needs to be created)
    static std::shared_ptr<SharedSession> get(const std::string &id);
    // remove a shared session from the table. this should be called by app.
    static void done(const std::string &id);


    SharedSession(const std::string &id);

    ~SharedSession(void) {DEB("Destroyed shared session " << id); }

//    static void del(const std::string &id);

    // send to all sessions
    void enqueue( const std::shared_ptr<MsgSerialized> &msg_serialized);
    void enqueue(MsgBuilder &msg_builder);

    // let a session join/leave this shared_session
    virtual void join(std::shared_ptr<MsgSession> new_msg_session);
    virtual void leave(std::shared_ptr<MsgSession> new_msg_session);

};

#endif