// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

$(function(){
  $('#signup-submit').click(function(evt){
    var $form = $('#signup');
    $.post( $form.attr('action'), $form.serialize() )
      .success(function(){
        $div = $('<div>').attr('id', 'signup-complete').html('Thank you for signing up!<br> You should receive an email shortly.');
        $form.replaceWith( $div );
      })
      .error(function(error){

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