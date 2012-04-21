// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

$(function(){
  $('#signup-submit').click(function(evt){
    var $form = $('#signup'),
        animatedLoader = "data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==",
        $img = $('<img>').attr('src', animatedLoader ).css('margin', '0 0 -4px 8px');
    $('#email-error').remove();
    $form.append($img);
    $.post( $form.attr('action'), $form.serialize() )
      .success(function(){
        $div = $('<div>').attr('id', 'signup-complete').html('Thank you for signing up!<br> You should receive an email shortly.');
        $form.replaceWith( $div );
      })
      .error(function(error){
        $img.remove();
        if(error.responseText.replace(/"/g,'') === 'invalid email address'){
          $('#email-error').remove();
          $form.append($('<div>').attr('id', 'email-error').text('There may be an error with the entered email, it doesn\'t appear valid.'))
        }else{
          $div = $('<div>').attr('id', 'signup-fail').html('Sorry, a technical error has occured! please try again later.');
          $form.replaceWith( $div );
        }

      })
    evt.preventDefault();
  })
});