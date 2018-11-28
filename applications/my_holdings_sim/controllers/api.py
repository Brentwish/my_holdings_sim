# Here go your api methods.


@auth.requires_signature()
def add_post():
    post_id = db.post.insert(
        post_title=request.vars.post_title,
        post_content=request.vars.post_content,
    )
    # We return the id of the new post, so we can insert it along all the others.
    return response.json(dict(post_id=post_id))


def get_post_list():
    results = []
    rows = db().select(db.post.ALL, orderby=~db.post.post_time)
    for row in rows:
        # I need to determine whether the user (myself, if I am logged in) liked this or not.
        # We cannot use joins that use the "on" expression.
        like = False
        rating = None
        if auth.user is not None:
            # Checks the like.
            r = db((db.user_like.post_id == row.id) & (db.user_like.user_email == auth.user.email)).select().first()
            like = (r is not None)
            # Checks the star.
            r = db((db.user_star.post_id == row.id) & (db.user_star.user_email == auth.user.email)).select().first()
            rating = None if r is None else r.rating
        results.append(dict(
            id=row.id,
            post_title=row.post_title,
            post_content=row.post_content,
            post_author=row.post_author,
            like=like,
            rating=rating,
        ))
    # For homogeneity, we always return a dictionary.
    return response.json(dict(post_list=results))


@auth.requires_signature()
def delete_post():
    post_id = int(request.vars.post_id)
    r = db.post(post_id)
    if r is not None:
        # For safety we check that the deleted post belongs to the user.
        if r.post_author != auth.user.email:
            raise(HTTP(403, "Not authorized"))
        # We delete the post
        r.delete_record()
    return "ok"
    

@auth.requires_signature()
def set_like():
    post_id = int(request.vars.post_id)
    like_status = request.vars.like.lower().startswith('t');
    if like_status:
        db.user_like.update_or_insert(
            (db.user_like.post_id == post_id) & (db.user_like.user_email == auth.user.email),
            post_id = post_id,
            user_email = auth.user.email
        )
    else:
        db((db.user_like.post_id == post_id) & (db.user_like.user_email == auth.user.email)).delete()
    return "ok" # Might be useful in debugging.


def get_likers():
    """Gets the list of people who liked a post."""
    post_id = int(request.vars.post_id)
    # We get directly the list of all the users who liked the post.
    rows = db(db.user_like.post_id == post_id).select(db.user_like.user_email)
    # If the user is logged in, we remove the user from the set.
    likers_set = set([r.user_email for r in rows])
    if auth.user:
        likers_set -= {auth.user.email}
    likers_list = list(likers_set)
    likers_list.sort()
    # We return this list as a dictionary field, to be consistent with all other calls.
    return response.json(dict(likers=likers_list))


def set_stars():
    """Sets the star rating of a post."""
    post_id = int(request.vars.post_id)
    rating = int(request.vars.rating)
    db.user_star.update_or_insert(
        (db.user_star.post_id == post_id) & (db.user_star.user_email == auth.user.email),
        post_id = post_id,
        user_email = auth.user.email,
        rating = rating
    )
    return "ok" # Might be useful in debugging.

@auth.requires_signature()
def watch_stock():
    val = request.vars.val
    symbol = request.vars.symbol
    email = auth.user.email
    if val == "true":
        db.watched_stocks.insert(user_email = email, symbol = symbol)
    else:
        db(db.watched_stocks.user_email == email and db.watched_stocks.symbol == symbol).delete()
    return response.json(dict(ok=True))

@auth.requires_signature()
def get_watched_stocks():
    email = auth.user.email
    result = []
    for row in db(db.watched_stocks.user_email == email).select():
        result.append(row.symbol)
    return response.json(dict(symbols=result))
